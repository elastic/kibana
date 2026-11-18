/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';
import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { YamlObject, YamlValue } from '../graph_rebuild/compare_rebuilt_workflow';
import { isObject } from '../graph_rebuild/compare_rebuilt_workflow';

/**
 * Matches a graph "+" wire-insertion control by its `data-insert-context`
 * (set verbatim from `WorkflowGraphInsertionContext` — see
 * `workflow_graph_wire_split_control.tsx`). Mirrors the shape the canvas
 * itself produces, so a spec can address a control the same way the app
 * addresses an insertion (`{ mode: 'after', stepName }`, etc.) without
 * depending on screen position or visible label text.
 */
export interface WireInsertSpec {
  readonly mode: 'prepend-step' | 'trigger' | 'after' | 'branch' | 'fallback';
  readonly stepName?: string;
  /** Only for `mode: 'branch'` — the owning step's branch slot kind. */
  readonly branchKind?: 'steps' | 'else' | 'branch' | 'case' | 'default';
  /** Only for `mode: 'branch'` with `branchKind` `case` or `branch` — which of the step's cases or branches. */
  readonly branchIndex?: number;
}

/** The id the graph gives the node of a step: its name, lower-cased, with `_` and spaces as `-`. */
export const graphNodeId = (stepName: string): string =>
  stepName.toLowerCase().replace(/[_\s]+/g, '-');

/** What a step form field turned out to be, read from the page. */
export type StepControlKind =
  | 'keyvalue'
  | 'json'
  | 'text'
  | 'text-input'
  | 'esql'
  | 'switch'
  | 'number'
  | 'tags'
  | 'dropdown';

interface StepControlDescription {
  tag: string;
  role: string | null;
  mode: string | null;
  language: string | null;
  inputType: string | null;
  tags: boolean;
  singleCombo: boolean;
  keyValue: boolean;
  sourceToggle: boolean;
  hasExpand: boolean;
}

/** A trigger input as the manual trigger form takes it. */
export interface TriggerInputSpec {
  name: string;
  type: string;
  description?: string;
  options?: string[];
  enum?: string[];
  required?: boolean;
  default?: YamlValue;
}

/** A workflow constant as the settings flyout takes it. */
export interface ConstSpec {
  name: string;
  value: YamlValue;
}

export interface ErrorHandlingSpec {
  continue?: boolean;
  retry?: { 'max-attempts'?: number; delay?: string };
}

const STEP_PANEL_SUBTITLE = 'workflowStepConfigPanelTypeSubtitle';
const FLOW_CONTROL_TYPES = new Set(['if', 'foreach', 'while', 'switch', 'parallel']);
const ACTION_MENU_TIMEOUT = 6_000;
const WIRE_CONTROL_TIMEOUT = 5_000;
const OPTIONAL_MENU_TIMEOUT = 3_000;
const PICKER_TIMEOUT = 2_000;
const TOGGLE_TIMEOUT = 2_000;
const DISCARD_MODAL_TIMEOUT = 1_000;
const TRIGGER_MENU_TIMEOUT = 2_500;
const ADD_TRIGGER_ATTEMPTS = 4;

/** A value that is one `{{ ref }}` or `${{ ref }}` and nothing else. */
const isWholeReference = (value: YamlValue): value is string =>
  typeof value === 'string' &&
  /^\s*\$?\{\{[\s\S]*\}\}\s*$/.test(value) &&
  (value.match(/\{\{/g) ?? []).length === 1;

const referenceExpression = (reference: string): string =>
  reference
    .trim()
    .replace(/^\$?\{\{/, '')
    .replace(/\}\}$/, '')
    .trim();

const hasFilter = (reference: string): boolean => referenceExpression(reference).includes('|');

/** `steps['a-b'].output` and `steps.a-b.output` are the same path; the data picker lists the dotted one. */
const toDottedPath = (expression: string): string =>
  expression.replace(/\[\s*(['"])(.*?)\1\s*\]/g, '.$2').replace(/\s+/g, '');

/** What kind of control a step form field is, from what the page shows of it. */
const classifyControl = (control: StepControlDescription): StepControlKind => {
  if (control.keyValue) return 'keyvalue';
  if (control.mode) return control.language === 'json' ? 'json' : 'text';
  // Editors that are always mounted (no read mode): ES|QL, and the JSON + Liquid source of data.parseJson.
  if (control.language === 'esql' || control.language === 'json-liquid') return 'esql';
  if (control.role === 'switch') return 'switch';
  if (control.tag === 'INPUT' && control.inputType === 'number') return 'number';
  if (control.singleCombo) return 'dropdown';
  if (control.tags) return 'tags';
  if (control.tag === 'INPUT') return 'text-input';
  return 'dropdown';
};

/**
 * Page object for authoring a workflow directly on the graph canvas: adding
 * a trigger from the empty state, inserting steps from a wire's "+" control
 * or a foreach group's first-step button, picking an action from the
 * resulting Actions menu, and editing the step configuration flyout that
 * opens on insert (Inputs form, optional fields, rename, close).
 */
export class WorkflowGraphAuthoringPage {
  public readonly emptyAddTrigger: Locator;
  public readonly actionsMenuSearch: Locator;
  public readonly triggerPanelSave: Locator;
  public readonly stepConfigPanel: Locator;
  public readonly stepConfigPanelClose: Locator;
  public readonly stepConfigPanelEditName: Locator;
  public readonly stepConfigPanelNameInput: Locator;
  public readonly stepConfigPanelDiscardModal: Locator;
  public readonly addOptionalFieldButton: Locator;
  public readonly fitViewButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.emptyAddTrigger = this.page.testSubj.locator('workflowGraphEmptyAddTrigger');
    this.actionsMenuSearch = this.page.locator('#actions-menu-search');
    this.triggerPanelSave = this.page.testSubj.locator('workflowTriggerConfigPanelSave');
    this.stepConfigPanel = this.page.testSubj.locator('workflowStepConfigPanel');
    this.stepConfigPanelClose = this.page.testSubj.locator('workflowStepConfigPanelClose');
    this.stepConfigPanelEditName = this.page.testSubj.locator('workflowStepConfigPanelEditName');
    this.stepConfigPanelNameInput = this.page.testSubj.locator('workflowStepConfigPanelNameInput');
    this.stepConfigPanelDiscardModal = this.page.testSubj.locator(
      'workflowStepConfigPanelDiscardModal'
    );
    this.addOptionalFieldButton = this.page.testSubj.locator('workflowStepConfigAddOptionalField');
    this.fitViewButton = this.page.testSubj.locator('workflowCanvas-fit-view');
  }

  /** Opens the trigger picker from the empty-canvas CTA. */
  async openAddTriggerFromEmptyCanvas(): Promise<void> {
    await this.emptyAddTrigger.click();
  }

  /** The wire control matching `spec`, once the graph has laid it out. */
  private async findWireControl(spec: WireInsertSpec): Promise<Locator> {
    const findControlId = () =>
      this.page.evaluate((matchSpec) => {
        const matches = (ctx: Record<string, unknown>): boolean => {
          if (ctx.mode !== matchSpec.mode) return false;
          if (matchSpec.stepName !== undefined && ctx.stepName !== matchSpec.stepName) return false;
          const branch = ctx.branch as { kind?: string; index?: number } | undefined;
          if (matchSpec.branchKind !== undefined && branch?.kind !== matchSpec.branchKind) {
            return false;
          }
          if (matchSpec.branchIndex !== undefined && branch?.index !== matchSpec.branchIndex) {
            return false;
          }
          return true;
        };
        for (const el of Array.from(document.querySelectorAll('[data-insert-context]'))) {
          try {
            const ctx = JSON.parse(el.getAttribute('data-insert-context') ?? '');
            if (matches(ctx)) return el.getAttribute('data-control-id');
          } catch {
            // Not a control for this insertion context — keep looking.
          }
        }
        return null;
      }, spec);
    // The graph lays out again after a panel closes, so the control can appear a moment after the call.
    await expect
      .poll(findControlId, {
        message: `No wire insertion control found for ${JSON.stringify(spec)}`,
        timeout: WIRE_CONTROL_TIMEOUT,
      })
      .not.toBeNull();
    return this.page.locator(`[data-control-id="${await findControlId()}"]`);
  }

  /**
   * Opens the Actions menu from the "+" wire control matching `spec`, by
   * hovering the control's hit-strip (mid-wire controls are hover-revealed,
   * per `workflow_graph_wire_split_control.tsx`) and clicking its button.
   */
  async openAddStepFromWire(spec: WireInsertSpec): Promise<void> {
    const control = await this.findWireControl(spec);
    await control.hover();
    await control.getByTestId('workflowGraphWireAddStep').click();
  }

  /**
   * Same as `openAddStepFromWire`, but the click goes straight to the control without a pointer: a long workflow
   * has controls outside the part of the canvas that is on screen, which a pointer cannot reach.
   */
  async openAddStepFromWireOffscreen(spec: WireInsertSpec): Promise<void> {
    const control = await this.findWireControl(spec);
    await control.getByTestId('workflowGraphWireAddStep').dispatchEvent('click');
  }

  /**
   * Opens the Actions menu to add the first step inside an empty foreach/while group. With the name of the
   * group's step it picks that group's button, so nested groups are not ambiguous.
   */
  async openAddFirstStepInGroup(stepName?: string): Promise<void> {
    if (stepName === undefined) {
      await this.page.testSubj.click('workflowGraphForeachGroupAddFirstStep');
      return;
    }
    await this.page
      .locator(`.react-flow__node[data-id="${graphNodeId(stepName)}"]`)
      .getByTestId('workflowGraphForeachGroupAddFirstStep')
      .click();
  }

  /**
   * Opens the Actions menu to add the first fallback step of a step. The error port only exists while the step's
   * "Continue on failure" is on and is revealed on hover, so the click is dispatched to it directly.
   */
  async openAddFallbackStep(stepName: string): Promise<void> {
    await this.page
      .locator(`.react-flow__node[data-id="${graphNodeId(stepName)}"]`)
      .getByTestId('workflowGraphPort-error')
      .dispatchEvent('click');
  }

  /**
   * Picks a step/connector action from the currently open Actions menu by
   * its exact display label. Narrows via the search box first so the match
   * is unambiguous regardless of category nesting.
   */
  async pickActionFromMenu(label: string): Promise<void> {
    await this.actionsMenuSearch.fill(label);
    await this.page.getByRole('option', { name: label, exact: false }).click();
  }

  /**
   * Picks a trigger type from the "Add trigger" menu. Unlike step actions,
   * trigger leaves render directly at the menu's root (no parent category
   * node) — the search box's category-based matching never recurses into
   * root-level leaves, so a trigger can only be picked from the unfiltered
   * root list, not found via `pickActionFromMenu`'s search.
   */
  async pickTrigger(label: string): Promise<void> {
    await this.page.getByRole('option', { name: label, exact: false }).click();
  }

  /** Clicks "Save trigger" to commit a trigger insert/edit. */
  async saveTrigger(): Promise<void> {
    await this.triggerPanelSave.click();
  }

  /** Locator for a step config field by its YAML path (e.g. `with.index`). */
  stepField(fieldPath: string): Locator {
    return this.page.testSubj.locator(`workflowStepConfigField-${fieldPath}`);
  }

  /**
   * Sets a step field to a plain string value. Some fields that are
   * logically strings are still schema-typed as a union (e.g.
   * `index: string | string[]`) and render as a JSON-kind input — such a
   * field parses its raw text as JSON, so it must be JSON-encoded first or
   * the edit is silently dropped. Detected via the field's `data-language`.
   */
  async setStepFieldValue(fieldPath: string, value: string): Promise<void> {
    const field = this.stepField(fieldPath);
    const language = await field.getAttribute('data-language');
    await field.fill(language === 'json' ? JSON.stringify(value) : value);
  }

  /** Sets a step field to a JSON object/array value, written as-is. */
  async setStepFieldJSON(fieldPath: string, value: unknown): Promise<void> {
    await this.stepField(fieldPath).fill(JSON.stringify(value));
  }

  /** Renames the step currently open in the config panel. */
  async renameCurrentStep(newName: string): Promise<void> {
    await this.stepConfigPanelEditName.click();
    await this.stepConfigPanelNameInput.fill(newName);
    await this.stepConfigPanelNameInput.press('Enter');
  }

  /** Reveals an optional field (hidden behind "Add optional") and returns its locator. */
  async addOptionalField(fieldPath: string): Promise<void> {
    await this.addOptionalFieldButton.click();
    await this.page.testSubj.click(`workflowStepConfigAddOptionalOption-${fieldPath}`);
  }

  /**
   * Removes a previously-revealed optional field. The remove (✕) control is
   * width/opacity-collapsed until the field row is hovered or focused —
   * hovering the field itself also satisfies the row's `:hover`, since the
   * field sits inside it.
   */
  async removeOptionalField(fieldPath: string): Promise<void> {
    await this.stepField(fieldPath).hover();
    await this.page.testSubj.click(`workflowStepConfigRemoveOptional-${fieldPath}`);
  }

  /** Closes the step config flyout (every edit already live-applies to the YAML). */
  async closeStepPanel(): Promise<void> {
    await this.stepConfigPanelClose.click();
  }

  /** Fits the graph to the viewport, for stable screenshots/debugging. Best-effort. */
  async fitView(): Promise<void> {
    if (await this.fitViewButton.isVisible()) {
      await this.fitViewButton.click();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Rebuilding any workflow: what the step form is made of, read from the page, not hard-coded per step type
  // ---------------------------------------------------------------------------------------------

  /**
   * Picks an action from the open Actions menu by its step type (`data.map`), the way a workflow file names it.
   * Returns false when the menu has no such action.
   */
  async pickActionByType(type: string): Promise<boolean> {
    await this.page.testSubj.locator('actionsMenuModal').waitFor();
    if (FLOW_CONTROL_TYPES.has(type)) {
      await this.page.locator('[data-option-id="flowControl"]').click();
    } else {
      await this.actionsMenuSearch.fill(type);
    }
    const option = this.page.locator(`[data-option-id="${type}"]`);
    try {
      await option.waitFor({ state: 'visible', timeout: ACTION_MENU_TIMEOUT });
    } catch {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await option.click();
    await this.stepConfigPanel.waitFor();
    return true;
  }

  /** Clicks the panel's subtitle, which is where a field is left: Tab is swallowed by the editors, Escape closes the panel. */
  async leaveField(): Promise<void> {
    await this.page.testSubj.click(STEP_PANEL_SUBTITLE);
  }

  /**
   * Replaces the content of the focused code editor with `text`. The text goes in as a dispatched paste: typing a
   * `{{` opens the reference picker, and `keyboard.insertText` is truncated by the editor's hidden textarea.
   */
  private async pasteIntoFocusedEditor(text: string): Promise<void> {
    // A field in read mode becomes an editor after the click; selecting before it has focus would select nothing,
    // and the paste would be added to the old content instead of replacing it.
    await this.page.waitForFunction(() => !!document.activeElement?.closest('.monaco-editor'));
    // Control, not Meta: on macOS the editor does not take Meta+A from the browser's automation, and it does take Control+A.
    await this.page.keyboard.press('Control+A');
    await this.page.evaluate((value) => {
      const data = new DataTransfer();
      data.setData('text/plain', value);
      document.activeElement?.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
      );
    }, text);
  }

  /** Replaces the text of an input. A test id can sit on a wrapper around the input, so the input inside is filled. */
  private async fillInput(field: Locator, text: string): Promise<void> {
    const isInput = await field.evaluate((el) => ['INPUT', 'TEXTAREA'].includes(el.tagName));
    const input = isInput ? field : field.locator('input, textarea');
    await input.fill(text);
    // Some of these fields keep their value until they lose focus.
    await input.evaluate((el) => (el as HTMLElement).blur());
  }

  private async describeControl(fieldPath: string): Promise<StepControlDescription | null> {
    return this.page.evaluate((id) => {
      const subject = (suffix: string) =>
        document.querySelector(`[data-test-subj="workflowStepConfigField-${id}${suffix}"]`);
      const el = subject('');
      if (!el) return null;
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        mode: el.getAttribute('data-mode'),
        language: el.getAttribute('data-language'),
        inputType: el.getAttribute('type'),
        tags: !!el.querySelector('[data-test-subj="comboBoxSearchInput"]'),
        singleCombo: !!el.querySelector('.euiComboBox__inputWrap--plainText'),
        keyValue: !!subject('-add'),
        sourceToggle: !!subject('-source'),
        hasExpand: !!el
          .closest('.workflowStepConfigFieldRow')
          ?.querySelector('[data-test-subj="workflowStepConfigDataReferenceExpand"]'),
      };
    }, fieldPath);
  }

  /** Adds an optional field through "Add optional". Returns false when the form has no such optional field. */
  private async revealOptionalField(fieldPath: string): Promise<boolean> {
    if (!(await this.addOptionalFieldButton.isVisible())) return false;
    await this.addOptionalFieldButton.click();
    const option = this.page.testSubj.locator(`workflowStepConfigAddOptionalOption-${fieldPath}`);
    try {
      await option.waitFor({ state: 'visible', timeout: OPTIONAL_MENU_TIMEOUT });
    } catch {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await option.click();
    try {
      await this.stepField(fieldPath).waitFor({ timeout: OPTIONAL_MENU_TIMEOUT });
    } catch {
      return false;
    }
    return true;
  }

  /**
   * Writes `value` into the form control at `fieldPath`, whatever kind of control it is. Returns false when the
   * form has no control for it. A failure to drive a control that is there is thrown.
   */
  async writeValue(fieldPath: string, value: YamlValue): Promise<boolean> {
    let description = await this.describeControl(fieldPath);
    if (!description && !(await this.revealOptionalField(fieldPath))) return false;
    description = description ?? (await this.describeControl(fieldPath));
    if (!description) return false;
    const kind = classifyControl(description);
    // Controls with a Fixed | Data switch take a whole reference from the data picker.
    if (description.sourceToggle && isWholeReference(value) && kind !== 'text' && kind !== 'json') {
      if (hasFilter(value)) await this.writeTypedReference(fieldPath, value);
      else await this.writeWholeReference(fieldPath, value);
      return true;
    }
    switch (kind) {
      case 'keyvalue':
        if (!isObject(value)) throw new Error('key/value rows need an object');
        await this.writeKeyValue(fieldPath, value);
        break;
      case 'json':
        await this.writeText(fieldPath, JSON.stringify(value), description);
        break;
      case 'text':
      case 'text-input':
        await this.writeText(
          fieldPath,
          typeof value === 'string' ? value : JSON.stringify(value),
          description
        );
        break;
      case 'esql':
        await this.stepField(fieldPath).click();
        await this.pasteIntoFocusedEditor(String(value));
        await this.leaveField();
        break;
      case 'switch':
        await this.writeSwitch(fieldPath, value === true);
        break;
      case 'number':
        await this.fillInput(this.stepField(fieldPath), String(value));
        await this.leaveField();
        break;
      case 'tags':
        await this.writeTags(fieldPath, value);
        break;
      case 'dropdown':
        await this.writeDropdown(fieldPath, String(value));
        break;
    }
    return true;
  }

  /** Pastes `text` into the editor of the expanded field (the sub-flyout), then goes back. */
  private async writeInSubFlyout(text: string): Promise<void> {
    await this.page.testSubj
      .locator('workflowFieldEditorSubFlyoutEditorPane')
      .locator('.monaco-editor')
      .click();
    await this.pasteIntoFocusedEditor(text);
    await this.page.testSubj.click('workflowFieldEditorSubFlyoutBack');
  }

  private async writeText(
    fieldPath: string,
    text: string,
    description: StepControlDescription,
    forceExpand = false
  ): Promise<void> {
    const field = this.stepField(fieldPath);
    if ((text.includes('\n') || forceExpand) && description.hasExpand) {
      await this.page
        .locator('.workflowStepConfigFieldRow')
        .filter({ has: field })
        .getByTestId('workflowStepConfigDataReferenceExpand')
        .click();
      await this.writeInSubFlyout(text);
      return;
    }
    await field.click();
    if (description.tag === 'INPUT' || description.tag === 'TEXTAREA') {
      await this.fillInput(field, text);
    } else {
      await this.pasteIntoFocusedEditor(text.replace(/\n/g, ' '));
    }
    await this.leaveField();
  }

  private async writeSwitch(fieldPath: string, wanted: boolean): Promise<void> {
    const field = this.stepField(fieldPath);
    if ((await field.getAttribute('aria-checked')) !== String(wanted)) await field.click();
    await expect(field).toHaveAttribute('aria-checked', String(wanted));
  }

  private async isOptionListOpen(): Promise<boolean> {
    return (await this.page.locator('[role="option"]:visible').count()) > 0;
  }

  private async writeDropdown(fieldPath: string, value: string): Promise<void> {
    const field = this.stepField(fieldPath);
    // Choosing a variant can already have set it (the `type` of a union), and its list does not offer the chosen option again.
    const selected = await field.evaluate(
      (el) =>
        el.querySelector('input')?.value ||
        (el.textContent ?? '').match(/Selected\. (.*?)\. Press Backspace/)?.[1]
    );
    if (selected === value) return;
    // The list of the previous dropdown can still be open, and a click then only closes it. Escape closes a list,
    // but with none open it closes the panel.
    if (await this.isOptionListOpen()) await this.page.keyboard.press('Escape');
    await field.click();
    const option = this.page
      .getByRole('option', { name: value, exact: true })
      .or(this.page.getByRole('menuitem', { name: value, exact: true }));
    try {
      await option.waitFor({ state: 'visible', timeout: OPTIONAL_MENU_TIMEOUT });
    } catch {
      // A dropdown that takes any text (a connector id) has no row for a value it does not list: it is typed.
      const search = field.getByTestId('comboBoxSearchInput');
      if ((await search.count()) > 0) {
        await search.fill(value);
        await search.press('Enter');
        const typed = await field.evaluate(
          (el) => el.querySelector('input')?.value || el.textContent || ''
        );
        if (typed.includes(value)) return;
      }
      if (await this.isOptionListOpen()) await this.page.keyboard.press('Escape');
      throw new Error(`no option "${value}"`);
    }
    await option.click();
  }

  private async writeTags(fieldPath: string, value: YamlValue): Promise<void> {
    const input = this.stepField(fieldPath).getByTestId('comboBoxSearchInput');
    for (const tag of [value].flat()) {
      await input.fill(String(tag));
      await input.press('Enter');
    }
  }

  /** Rows of name / value. A value that is not text is written as JSON, which the cell takes as-is. */
  private async writeKeyValue(fieldPath: string, rows: YamlObject): Promise<void> {
    let index = 0;
    for (const [key, value] of Object.entries(rows)) {
      await this.stepField(`${fieldPath}-add`).click();
      await this.stepField(`${fieldPath}-key-${index}`).pressSequentially(key);
      const cell = this.stepField(`${fieldPath}-value-${index}`);
      if ((await cell.getAttribute('data-mode')) === 'read') await cell.click();
      await this.pasteIntoFocusedEditor(
        typeof value === 'string' ? value.replace(/\n/g, ' ') : JSON.stringify(value)
      );
      await this.leaveField();
      index += 1;
    }
  }

  /** A whole `${{ x }}` in a field that has a Fixed | Data switch: switch to Data and pick that exact path. */
  private async writeWholeReference(fieldPath: string, value: string): Promise<void> {
    const wanted = toDottedPath(referenceExpression(value));
    await this.stepField(`${fieldPath}-source-data`).click();
    await this.stepField(`${fieldPath}-pick`).click();
    const search = this.page.testSubj.locator('workflowDataReferenceSearch');
    await search.fill(wanted);
    const row = this.page.testSubj.locator(`workflowDataReferenceRow-${wanted}`);
    try {
      await row.waitFor({ state: 'visible', timeout: PICKER_TIMEOUT });
    } catch {
      // The picker only lists the fields an output declares. A deeper path under a step it does list is typed instead.
      const prefix = wanted.split('.').slice(0, 2).join('.');
      let hasPrefix = false;
      if (prefix !== wanted) {
        await search.fill(prefix);
        const rows = this.page.locator(
          `[data-test-subj="workflowDataReferenceRow-${prefix}"], [data-test-subj^="workflowDataReferenceRow-${prefix}."]`
        );
        hasPrefix = await expect(rows)
          .not.toHaveCount(0, { timeout: PICKER_TIMEOUT })
          .then(
            () => true,
            () => false
          );
      }
      await this.page.keyboard.press('Escape');
      if (hasPrefix) return this.writeTypedReference(fieldPath, value);
      const offered = await this.page
        .locator('[data-test-subj^="workflowDataReferenceRow-"]')
        .evaluateAll((els) =>
          els
            .slice(0, 3)
            .map((el) =>
              el.getAttribute('data-test-subj')?.replace('workflowDataReferenceRow-', '')
            )
        );
      throw new Error(
        `the picker does not offer ${wanted}${
          offered.length ? ` (it offers ${offered.join(', ')})` : ''
        }`
      );
    }
    await row.click();
  }

  /**
   * A whole reference the data picker cannot pick (it has a filter, or goes deeper than the output the picker lists),
   * so it goes in as text on the Fixed side: through the expanded editor where the control has one, typed as an entry
   * in a list. A number, a yes/no and a dropdown have no editor on the Fixed side, but their Data box has an expand
   * control that opens one, and a reference written there keeps its type.
   */
  private async writeTypedReference(fieldPath: string, value: string): Promise<void> {
    await this.stepField(`${fieldPath}-source-fixed`).click();
    const description = await this.describeControl(fieldPath);
    if (!description) throw new Error('the control disappeared after switching to Fixed');
    const kind = classifyControl(description);
    if (kind === 'number' || kind === 'switch' || kind === 'dropdown') {
      await this.stepField(`${fieldPath}-source-data`).click();
      await this.stepField(`${fieldPath}-expand`).click();
      await this.writeInSubFlyout(value);
      return;
    }
    if (kind === 'json' && description.hasExpand) {
      return this.writeText(fieldPath, JSON.stringify(value), description, true);
    }
    if (kind === 'tags') return this.writeTags(fieldPath, value);
    throw new Error(
      `the reference cannot be typed: the ${kind} control has no editor that takes it`
    );
  }

  /** A `with` whose fields are alternative shapes (a "Fields" group): picks the shape that has the most of the given keys. */
  async chooseVariantFor(withKeys: string[]): Promise<void> {
    const variantIds = await this.stepField('with-variantGroup-variants')
      .locator('button')
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('data-test-subj') ?? '')
      );
    const choose = async (variantId: string) => {
      const button = this.page.testSubj.locator(variantId);
      await button.click();
      // The fields of the chosen shape are rendered in the same update that marks the button.
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    };
    let best = { score: -1, variantId: '' };
    for (const variantId of variantIds) {
      await choose(variantId);
      let score = 0;
      for (const key of withKeys) {
        if ((await this.stepField(`with.${key}`).count()) > 0) score += 1;
      }
      if (score > best.score) best = { score, variantId };
    }
    if (variantIds.length > 0) await choose(best.variantId);
  }

  /**
   * Opens the Advanced accordion if it is closed. The controls inside are in the page, and have a box, while it is
   * closed, so the state is read from the accordion button. Returns false when the step has no such section.
   */
  async openAdvanced(): Promise<boolean> {
    const button = this.stepConfigPanel.getByRole('button', { name: 'Advanced', exact: true });
    if ((await button.count()) === 0) return false;
    if ((await button.getAttribute('aria-expanded')) !== 'true') {
      await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
    }
    return true;
  }

  /** Retry and continue-on-failure. Returns what went wrong, as `issues`, or `unsupported` when the step has no such section. */
  async setErrorHandling(
    onFailure: ErrorHandlingSpec
  ): Promise<{ unsupported: string[]; issues: string[] }> {
    const problems = { unsupported: [] as string[], issues: [] as string[] };
    if (!(await this.openAdvanced())) {
      problems.unsupported.push('no Advanced section');
      return problems;
    }
    const toggle = async (testSubj: string, on: boolean) => {
      const control = this.page.testSubj.locator(testSubj);
      await control.waitFor();
      if ((await control.getAttribute('aria-checked')) !== String(on)) await control.click();
      try {
        await expect(control).toHaveAttribute('aria-checked', String(on), {
          timeout: TOGGLE_TIMEOUT,
        });
      } catch {
        problems.issues.push(`${testSubj} did not switch ${on ? 'on' : 'off'}`);
      }
    };
    if (onFailure.continue) await toggle('workflowStepConfigErrorContinue', true);
    if (onFailure.retry) {
      await toggle('workflowStepConfigErrorRetry', true);
      const { 'max-attempts': attempts, delay } = onFailure.retry;
      if (attempts !== undefined) {
        await this.fillInput(
          this.page.testSubj.locator('workflowStepConfigErrorMaxAttempts'),
          String(attempts)
        );
      }
      if (delay !== undefined) {
        await this.fillInput(
          this.page.testSubj.locator('workflowStepConfigErrorDelay'),
          String(delay)
        );
      }
      await this.leaveField();
    }
    return problems;
  }

  /** The `match` of each case of a switch step, adding a case row where there is none yet. */
  async setSwitchCases(matches: Array<string | number | boolean>): Promise<void> {
    for (const [index, match] of matches.entries()) {
      const field = this.page.testSubj.locator(`workflowSwitchCaseMatch-${index}`);
      if ((await field.count()) === 0) await this.page.testSubj.click('workflowSwitchCaseAdd');
      await this.fillInput(field, String(match));
    }
    await this.leaveField();
  }

  /**
   * Closes the step panel. A draft with errors makes the app ask to discard it: the draft is discarded and what the
   * dialog said is returned, so the caller can report it. Returns null when the panel closed without asking.
   */
  async closeStepPanelDiscardingDraft(): Promise<string | null> {
    if ((await this.stepConfigPanel.count()) === 0) return null;
    await this.stepConfigPanelClose.click();
    try {
      await this.stepConfigPanelDiscardModal.waitFor({
        state: 'visible',
        timeout: DISCARD_MODAL_TIMEOUT,
      });
    } catch {
      return null;
    }
    const message = (await this.stepConfigPanelDiscardModal.innerText())
      .replace(/\s+/g, ' ')
      .trim();
    await this.stepConfigPanelDiscardModal
      .getByRole('button', { name: 'Discard', exact: true })
      .click();
    await this.stepConfigPanelDiscardModal.waitFor({ state: 'hidden' });
    return message;
  }

  // ---------------------------------------------------------------------------------------------
  // Rebuilding any workflow: settings and triggers
  // ---------------------------------------------------------------------------------------------

  /**
   * The id of the newest row of a list whose rows carry `<testSubjPrefix><id>`: rows are added at the end, and an
   * added row is the one to fill.
   */
  private async newestRowSuffix(testSubjPrefix: string): Promise<string> {
    await expect(this.page.locator(`[data-test-subj^="${testSubjPrefix}"]`)).not.toHaveCount(0);
    const testSubjs = await this.page
      .locator(`[data-test-subj^="${testSubjPrefix}"]`)
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-test-subj') ?? ''));
    return testSubjs[testSubjs.length - 1].replace(testSubjPrefix, '');
  }

  /** Fills the workflow settings flyout: name, description, tags and constants, then closes it. */
  async fillSettings(settings: {
    name: string;
    description?: string;
    tags?: string[];
    consts?: ConstSpec[];
  }): Promise<void> {
    const { name, description, tags = [], consts = [] } = settings;
    await this.page.testSubj.click('workflowSettingsButton');
    await this.page.testSubj.locator('workflowSettingsFlyout').waitFor();
    await this.fillInput(this.page.testSubj.locator('workflowSettingsNameInput'), name);
    if (description) {
      await this.fillInput(
        this.page.testSubj.locator('workflowSettingsDescriptionInput'),
        description
      );
    }
    const tagsInput = this.page.testSubj
      .locator('workflowSettingsTagsInput')
      .getByTestId('comboBoxSearchInput');
    for (const tag of tags) {
      await tagsInput.fill(tag);
      await tagsInput.press('Enter');
    }
    if (consts.length > 0) await this.page.testSubj.click('workflowSettingsTab-constants');
    for (const { name: constName, value } of consts) {
      await this.page.testSubj.click('workflowSettingsConstAdd');
      const suffix = await this.newestRowSuffix('workflowSettingsConstName-');
      const last = (part: string) =>
        this.page.testSubj.locator(`workflowSettingsConst${part}-${suffix}`);
      await this.fillInput(last('Name'), constName);
      const kind = Array.isArray(value)
        ? 'array'
        : value !== null && typeof value === 'object'
        ? 'object'
        : typeof value;
      if (kind !== 'string') await last('Type').selectOption(kind);
      // The value of every type is a text field; a boolean, number, array or object is written as its JSON.
      await this.fillInput(
        last('Value'),
        typeof value === 'string' ? value : JSON.stringify(value)
      );
      await last('Done').click();
    }
    await this.page.testSubj.click('workflowSettingsFlyoutDone');
    await this.page.testSubj.locator('workflowSettingsFlyout').waitFor({ state: 'hidden' });
  }

  /**
   * Adds a trigger of the type shown as `label` in the trigger menu and leaves its panel open. Returns false when
   * the menu has no such trigger. A click that lands before the app is ready is lost, so it is repeated.
   */
  async addTrigger(label: string, isFirst: boolean): Promise<boolean> {
    const modal = this.page.testSubj.locator('actionsMenuModal');
    const opener = isFirst
      ? this.emptyAddTrigger
      : this.page.testSubj.locator('workflowGraphAddTrigger');
    for (let attempt = 0; !(await modal.isVisible()); attempt += 1) {
      if (attempt === ADD_TRIGGER_ATTEMPTS) throw new Error('the trigger menu did not open');
      await opener.click();
      await modal.waitFor({ timeout: TRIGGER_MENU_TIMEOUT }).catch(() => {});
    }
    // A menu row reads "Manual" + its description, so match on how the row starts; "Alert" is not the "Alerting" category.
    const row = modal.getByRole('option', { name: new RegExp(`^${escapeRegExp(label)}\\b`) });
    if ((await row.count()) === 0) {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await row.click();
    await this.page.testSubj.locator('workflowTriggerConfigPanel').waitFor();
    return true;
  }

  async setTriggerEvery(every: string): Promise<void> {
    await this.fillInput(this.page.testSubj.locator('workflowTriggerConfigPanelEvery'), every);
  }

  /** One input of the manual trigger: name, type, description, allowed values, and required or default. */
  async addTriggerInput(input: TriggerInputSpec): Promise<void> {
    await this.page.testSubj.click('workflowTriggerConfigInput-add');
    const suffix = await this.newestRowSuffix('workflowTriggerConfigInput-name-');
    const field = (part: string) =>
      this.page.testSubj.locator(`workflowTriggerConfigInput-${part}-${suffix}`);
    await this.fillInput(field('name'), input.name);
    await field('type').selectOption(input.type === 'choice' ? 'string' : input.type);
    if (input.description)
      await field('description').fill(String(input.description).slice(0, 2000));
    const allowed = input.options ?? input.enum;
    if (allowed) await field('allowed').fill(allowed.join(', '));
    // The value is either required, or has a default, or is left empty: the form does not allow two of them.
    const radio = (mode: string) => this.page.locator(`[id="${suffix}-mode-${mode}"]`);
    if (input.default !== undefined) {
      await radio('default').click();
      await this.fillInput(
        field('default'),
        typeof input.default === 'string' ? input.default : JSON.stringify(input.default)
      );
    } else if (input.required === true) {
      await radio('required').click();
    }
  }
}
