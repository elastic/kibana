/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import type { ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import type {
  RebuildDiff,
  WorkflowDocument,
  WorkflowStep,
  YamlObject,
  YamlValue,
} from './compare_rebuilt_workflow';
import { asObjects, asSteps, compareWorkflows, isObject } from './compare_rebuilt_workflow';
import type { WorkflowsApiServicesFixture } from '..';
import type { WorkflowsPageObjects } from '../page_objects';
import type {
  ConstSpec,
  ErrorHandlingSpec,
  TriggerInputSpec,
  WireInsertSpec,
  WorkflowGraphAuthoringPage,
} from '../page_objects/workflow_graph_authoring_page';

/** A thing the graph builder could not do, or got wrong, while rebuilding: where it was, and what. */
export interface RebuildNote {
  where: string;
  what: string;
}

export interface RebuildResult {
  /** The id of the workflow that was saved. */
  workflowId: string;
  /** What the saved workflow differs in from the input, step by step. */
  diffs: RebuildDiff[];
  /** Values the form has no control for. They are reported, never written through the YAML editor. */
  unsupported: RebuildNote[];
  /** Trouble met while building: a step that failed, an error toast, a draft the form refused. */
  issues: RebuildNote[];
  identical: number;
  total: number;
}

export interface RebuildOptions {
  page: ScoutPage;
  pageObjects: WorkflowsPageObjects;
  apiServices: WorkflowsApiServicesFixture;
  /** The workflow to reproduce, as a library workflow file would be written. */
  yaml: string;
  /** The name the rebuilt workflow is saved under. */
  name: string;
}

/** Where the next step goes. */
type Anchor =
  | { kind: 'start' }
  | { kind: 'after'; stepName: string }
  | { kind: 'branch'; spec: WireInsertSpec }
  | { kind: 'group'; stepName: string }
  | { kind: 'fallback'; stepName: string };

/** The keys of a step that are not form fields of their own (they are built separately, or are the step's children). */
const NON_FIELD_KEYS = new Set([
  'name',
  'type',
  'with',
  'steps',
  'else',
  'cases',
  'default',
  'on-failure',
]);
const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};
/** How long a form action waits for its control: a value with no control is reported after this, not after Playwright's default. */
const FORM_ACTION_TIMEOUT = 15_000;
const SAVE_TIMEOUT = 30_000;
const ADD_STEP_ATTEMPTS = 3;
const ACTIONS_MENU_TIMEOUT = 3_000;

const firstLine = (error: Error | string): string =>
  String(error instanceof Error ? error.message : error).split('\n')[0];

const toTriggerInput = (input: YamlObject): TriggerInputSpec => ({
  name: String(input.name),
  type: String(input.type),
  description: typeof input.description === 'string' ? input.description : undefined,
  options: Array.isArray(input.options) ? input.options.map(String) : undefined,
  enum: Array.isArray(input.enum) ? input.enum.map(String) : undefined,
  required: input.required === true,
  default: input.default,
});

const toErrorHandling = (onFailure: YamlObject): ErrorHandlingSpec => {
  const { retry } = onFailure;
  return {
    continue: onFailure.continue === true,
    retry: isObject(retry)
      ? {
          'max-attempts':
            typeof retry['max-attempts'] === 'number' ? retry['max-attempts'] : undefined,
          delay: typeof retry.delay === 'string' ? retry.delay : undefined,
        }
      : undefined,
  };
};

class GraphRebuild {
  private readonly original: WorkflowDocument;
  private readonly authoring: WorkflowGraphAuthoringPage;
  private readonly unsupported: RebuildNote[] = [];
  private readonly issues: RebuildNote[] = [];

  constructor(private readonly options: RebuildOptions) {
    this.original = YAML.parse(options.yaml);
    this.authoring = options.pageObjects.workflowGraphAuthoring;
  }

  async run(): Promise<RebuildResult> {
    const { page, pageObjects, apiServices } = this.options;
    const { workflowEditor } = pageObjects;
    page.setDefaultTimeout(FORM_ACTION_TIMEOUT);

    await workflowEditor.gotoNewWorkflow();
    await workflowEditor.graphCanvas.waitFor({ state: 'visible' });
    await this.buildTriggers();
    await this.fillSettings();
    await this.buildBody(this.original.steps, { kind: 'start' }, '');
    await this.closePanel('workflow');
    await this.checkToasts('workflow');

    await workflowEditor.saveButton.click();
    await page.waitForURL(/\/workflows\/(?!create)[^/?#]+/, { timeout: SAVE_TIMEOUT });
    const workflowId = page.url().match(/\/workflows\/([^/?#]+)/)?.[1] ?? '';
    const saved = await apiServices.workflows.getWorkflow(workflowId);
    const built: WorkflowDocument = YAML.parse(saved.yaml);

    const { diffs, identical, total } = compareWorkflows(this.original, built);
    return {
      workflowId,
      diffs,
      unsupported: this.unsupported,
      issues: this.issues,
      identical,
      total,
    };
  }

  private note(list: RebuildNote[], where: string, what: string): void {
    list.push({ where, what });
  }

  // -------------------------------------------------------------------------------------------
  // Workflow level: triggers and settings
  // -------------------------------------------------------------------------------------------
  private async buildTriggers(): Promise<void> {
    for (const [index, trigger] of (this.original.triggers ?? []).entries()) {
      await this.buildTrigger(trigger, index);
    }
  }

  private async buildTrigger(trigger: YamlObject, index: number): Promise<void> {
    const type = String(trigger.type);
    const where = `trigger ${index + 1} (${type})`;
    const label = TRIGGER_LABELS[type];
    if (!label) {
      this.note(this.unsupported, where, 'trigger type has no entry in this builder');
      return;
    }
    if (!(await this.authoring.addTrigger(label, index === 0))) {
      this.note(this.unsupported, where, 'not in the trigger menu');
      return;
    }
    try {
      if (type === 'manual') {
        for (const input of asObjects(trigger.inputs)) {
          await this.authoring.addTriggerInput(toTriggerInput(input));
        }
      }
      if (type === 'scheduled') {
        const { with: schedule } = trigger;
        if (isObject(schedule) && typeof schedule.every === 'string') {
          await this.authoring.setTriggerEvery(schedule.every);
        } else {
          this.note(
            this.unsupported,
            where,
            `schedule ${JSON.stringify(schedule)} has no control (only "every")`
          );
        }
      }
    } catch (error) {
      this.note(this.issues, where, firstLine(error as Error));
      await this.attachScreenshot(`fail-trigger-${index}`);
    }
    await this.authoring.saveTrigger();
    await this.authoring.triggerPanelSave.waitFor({ state: 'hidden' });
  }

  private async fillSettings(): Promise<void> {
    const { original } = this;
    const consts: ConstSpec[] = Object.entries(original.consts ?? {}).map(([constName, value]) => ({
      name: constName,
      value,
    }));
    if (original.settings) {
      this.note(
        this.unsupported,
        'settings',
        `workflow settings ${JSON.stringify(original.settings)} have no control`
      );
    }
    await this.authoring.fillSettings({
      name: this.options.name,
      description:
        typeof original.description === 'string' ? original.description.trim() : undefined,
      tags: original.tags,
      consts,
    });
  }

  // -------------------------------------------------------------------------------------------
  // Steps
  // -------------------------------------------------------------------------------------------
  /** Builds a list of steps into a body. `first` is where its first step goes; the rest hang below the previous one. */
  private async buildBody(
    steps: WorkflowStep[] | undefined,
    first: Anchor,
    where: string
  ): Promise<void> {
    let previous: WorkflowStep | undefined;
    for (const step of steps ?? []) {
      const here = `${where}${step.name}`;
      try {
        const anchor: Anchor = previous ? { kind: 'after', stepName: previous.name } : first;
        if (await this.buildStepNode(step, anchor, here)) {
          await this.buildChildren(step, `${here} > `);
          previous = step;
        }
      } catch (error) {
        this.note(this.issues, here, `failed: ${firstLine(error as Error)}`);
        await this.attachScreenshot(`fail-${step.name}`);
        await this.recoverFromFailedStep();
      }
    }
  }

  private async buildChildren(step: WorkflowStep, where: string): Promise<void> {
    const { name, type } = step;
    const steps = asSteps(step.steps);
    const elseSteps = asSteps(step.else);
    const onFailure = isObject(step['on-failure']) ? step['on-failure'] : undefined;
    const fallback = asSteps(onFailure?.fallback);
    const branch = (spec: Pick<WireInsertSpec, 'branchKind' | 'branchIndex'>): Anchor => ({
      kind: 'branch',
      spec: { mode: 'branch', stepName: name, ...spec },
    });
    if (type === 'if') {
      await this.buildBody(steps, branch({ branchKind: 'steps' }), where);
      await this.buildBody(elseSteps, branch({ branchKind: 'else' }), `${where}else > `);
    } else if (type === 'foreach' || type === 'while') {
      await this.buildBody(steps, { kind: 'group', stepName: name }, where);
    } else if (type === 'switch') {
      for (const [index, item] of asObjects(step.cases).entries()) {
        await this.buildBody(
          asSteps(item.steps),
          branch({ branchKind: 'case', branchIndex: index }),
          `${where}case ${index} > `
        );
      }
      await this.buildBody(
        asSteps(step.default),
        branch({ branchKind: 'default' }),
        `${where}default > `
      );
    } else if (steps.length || elseSteps.length) {
      this.note(
        this.unsupported,
        `${where}${name}`,
        `nested steps of a ${type} step are not handled`
      );
    }
    if (fallback.length) {
      await this.buildBody(fallback, { kind: 'fallback', stepName: name }, `${where}fallback > `);
    }
  }

  private async openAnchor(anchor: Anchor): Promise<void> {
    switch (anchor.kind) {
      case 'start':
        return this.authoring.openAddStepFromWireOffscreen({ mode: 'prepend-step' });
      case 'after':
        return this.authoring.openAddStepFromWireOffscreen({
          mode: 'after',
          stepName: anchor.stepName,
        });
      case 'branch':
        return this.authoring.openAddStepFromWireOffscreen(anchor.spec);
      case 'group':
        return this.authoring.openAddFirstStepInGroup(anchor.stepName);
      case 'fallback':
        return this.authoring.openAddFallbackStep(anchor.stepName);
    }
  }

  /** Adds one step at `anchor` and fills its form. Returns false when the step could not be added. */
  private async buildStepNode(step: WorkflowStep, anchor: Anchor, where: string): Promise<boolean> {
    const menu = this.options.page.testSubj.locator('actionsMenuModal');
    // A click that lands before the app is ready is lost, so opening the menu is retried.
    for (let attempt = 1; attempt <= ADD_STEP_ATTEMPTS; attempt += 1) {
      try {
        await this.openAnchor(anchor);
        await menu.waitFor({ timeout: ACTIONS_MENU_TIMEOUT });
        break;
      } catch (error) {
        if (attempt === ADD_STEP_ATTEMPTS) throw error;
      }
    }
    if (!(await this.authoring.pickActionByType(step.type))) {
      this.note(
        this.unsupported,
        where,
        `step type ${step.type} is not in the actions menu${
          step.type.startsWith('loop.') ? ' (not offered inside a loop either)' : ''
        }`
      );
      return false;
    }
    await this.authoring.renameCurrentStep(step.name);
    for (const [key, value] of Object.entries(step).filter(
      ([field]) => !NON_FIELD_KEYS.has(field)
    )) {
      // The step-level condition and timeout sit in the Advanced accordion, for the steps that take them.
      if (key === 'if' || key === 'timeout') await this.authoring.openAdvanced();
      await this.setPath(key, value, where);
    }
    const { with: withValue } = step;
    if (isObject(withValue)) {
      await this.authoring.chooseVariantFor(Object.keys(withValue));
      if ((await this.authoring.stepField('with').count()) > 0) {
        await this.setPath('with', withValue, where);
      } else {
        for (const [key, value] of Object.entries(withValue)) {
          await this.setPath(`with.${key}`, value, where);
        }
      }
    }
    if (step.type === 'switch') {
      await this.authoring.setSwitchCases(
        asObjects(step.cases).map((item) => item.match as string | number | boolean)
      );
    }
    const onFailure = step['on-failure'];
    if (isObject(onFailure)) {
      const problems = await this.authoring.setErrorHandling(toErrorHandling(onFailure));
      for (const what of problems.unsupported) this.note(this.unsupported, where, what);
      for (const what of problems.issues) this.note(this.issues, where, what);
    }
    await this.closePanel(where);
    await this.checkToasts(where);
    return true;
  }

  /** Writes a value at a path; with no control there, tries its children (a record whose fields are separate controls). */
  private async setPath(path: string, value: YamlValue, where: string): Promise<void> {
    try {
      if (await this.authoring.writeValue(path, value)) return;
    } catch (error) {
      this.note(this.issues, where, `${path}: ${firstLine(error as Error)}`);
      return;
    }
    if (isObject(value) && Object.keys(value).length > 0) {
      for (const [key, child] of Object.entries(value)) {
        await this.setPath(`${path}.${key}`, child, where);
      }
      return;
    }
    this.note(this.unsupported, where, `no form control for ${path}`);
  }

  /** Closes the panel. A draft the form refuses is reported, and was discarded. */
  private async closePanel(where: string): Promise<void> {
    const discarded = await this.authoring.closeStepPanelDiscardingDraft();
    if (discarded !== null) {
      await test
        .info()
        .attach(`discarded-draft-${where}`, { body: discarded, contentType: 'text/plain' });
      this.note(
        this.issues,
        where,
        'the form refused the draft (it has errors) and it was discarded when the panel closed'
      );
    }
  }

  /** Toasts the app raised while building (for example "Step not found" when an edit cannot be applied). */
  private async checkToasts(where: string): Promise<void> {
    const toast = this.options.page.components.toast();
    const texts = (await toast.toasts.allInnerTexts()).map((text) =>
      text.replace(/\s+/g, ' ').trim()
    );
    for (const text of new Set(texts)) {
      this.note(this.issues, where, `the app reported: ${text.slice(0, 160)}`);
    }
    if (texts.length > 0) await toast.closeAll();
  }

  /** After a step failed half-way its panel can still be open, which would block the next insertion. */
  private async recoverFromFailedStep(): Promise<void> {
    try {
      await this.authoring.closeStepPanelDiscardingDraft();
    } catch {
      // Nothing more can be done for this step; the next one reports its own trouble.
    }
  }

  private async attachScreenshot(label: string): Promise<void> {
    try {
      await test.info().attach(label, {
        body: await this.options.page.screenshot(),
        contentType: 'image/png',
      });
    } catch {
      // The page may be gone.
    }
  }
}

/**
 * Rebuilds a workflow through the graph view only (the YAML editor is never touched): triggers, settings, then every
 * step, each added from a wire's "+" and filled in the step form. The workflow is then saved, read back over the API
 * and compared with the input. The form is read, not hard-coded: for each value the control at
 * `workflowStepConfigField-<path>` is found on the page, and what kind of control it is decides how it is driven.
 */
export const rebuildWorkflowInGraph = async (options: RebuildOptions): Promise<RebuildResult> =>
  new GraphRebuild(options).run();
