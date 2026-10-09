/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

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
}

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

  /**
   * Opens the Actions menu from the "+" wire control matching `spec`, by
   * hovering the control's hit-strip (mid-wire controls are hover-revealed,
   * per `workflow_graph_wire_split_control.tsx`) and clicking its button.
   */
  async openAddStepFromWire(spec: WireInsertSpec): Promise<void> {
    const controlId = await this.page.evaluate((matchSpec) => {
      const matches = (ctx: Record<string, unknown>): boolean => {
        if (ctx.mode !== matchSpec.mode) return false;
        if (matchSpec.stepName !== undefined && ctx.stepName !== matchSpec.stepName) return false;
        if (
          matchSpec.branchKind !== undefined &&
          (ctx.branch as { kind?: string } | undefined)?.kind !== matchSpec.branchKind
        ) {
          return false;
        }
        return true;
      };
      for (const el of Array.from(document.querySelectorAll('[data-insert-context]'))) {
        let ctx: Record<string, unknown>;
        try {
          ctx = JSON.parse(el.getAttribute('data-insert-context') ?? '');
        } catch {
          continue;
        }
        if (matches(ctx)) return el.getAttribute('data-control-id');
      }
      return null;
    }, spec);
    if (!controlId) {
      throw new Error(`No wire insertion control found for ${JSON.stringify(spec)}`);
    }
    const control = this.page.locator(`[data-control-id="${controlId}"]`);
    await control.hover();
    await control.getByTestId('workflowGraphWireAddStep').click();
  }

  /** Opens the Actions menu to add the first step inside an empty foreach/while group. */
  async openAddFirstStepInGroup(): Promise<void> {
    await this.page.testSubj.click('workflowGraphForeachGroupAddFirstStep');
  }

  /**
   * Picks an action (trigger type or step type) from the currently open
   * Actions menu by its exact display label. Narrows via the search box
   * first so the match is unambiguous regardless of category nesting.
   */
  async pickActionFromMenu(label: string): Promise<void> {
    await this.actionsMenuSearch.fill(label);
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

  /** Removes a previously-revealed optional field. */
  async removeOptionalField(fieldPath: string): Promise<void> {
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
}
