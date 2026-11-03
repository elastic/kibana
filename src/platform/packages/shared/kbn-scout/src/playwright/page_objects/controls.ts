/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright-core';
import type { ScoutPage } from '..';
import { OptionsListControl } from './options_list_control';

/**
 * Page object for the control-group surface shared by Discover (ES|QL controls, tab controls),
 * Dashboard, Observability alerts, and Infra hosts view — any app that embeds
 * `ControlGroupRenderer` or `@kbn/control-group-renderer`.
 *
 * Owned here rather than by `DashboardApp` because the surface is not dashboard-specific: the
 * same control frame, options-list popover, and hover-action subjects appear wherever the
 * control group is embedded. The pattern mirrors `QueryBar`, which is documented as "shared by
 * Discover, Dashboard, Maps, Visualize/Lens and other apps that embed `unified_search`."
 */
export class Controls {
  /** The control-group wrapper element (`controls-group-wrapper`). */
  readonly group: Locator;
  /** All control frames in the page (`control-frame`). */
  readonly frames: Locator;
  /** Interactions with the options-list control popover. */
  readonly optionsList: OptionsListControl;

  constructor(private readonly page: ScoutPage) {
    this.group = this.page.testSubj.locator('controls-group-wrapper');
    this.frames = this.page.testSubj.locator('control-frame');
    this.optionsList = new OptionsListControl(page);
  }

  /**
   * Locator for the `control-frame` element that wraps the given control.
   *
   * Prefer this over {@link getControlElement} when you need to scope to the outer frame (e.g.
   * to reach title or error elements inside the frame). Use {@link getControlElement} when
   * hover-action buttons are attached to the inner control element itself.
   */
  getFrame(controlId: string): Locator {
    return this.page.testSubj
      .locator('control-frame')
      .filter({ has: this.page.locator(`[data-control-id="${controlId}"]`) });
  }

  /**
   * Locator for the inner control element identified by `data-control-id`. Hover-action buttons
   * (`hover-actions-${controlId}`) are children of this element.
   */
  getControlElement(controlId: string): Locator {
    return this.page.locator(`[data-control-id="${controlId}"]`);
  }

  /**
   * Returns all control IDs in the page, in DOM order. Throws if no control frames are found.
   */
  async getControlIds(): Promise<string[]> {
    await this.frames.evaluateAll((frames) => {
      if (!frames.length) {
        throw new Error('No control frames found');
      }
    });

    return this.frames
      .locator('[data-control-id]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-control-id') ?? ''));
  }

  /**
   * Returns the single control ID when exactly one control is present. Throws otherwise.
   * Assert the count with `controls.frames.toHaveCount(1)` first when the exact number matters.
   */
  async getOnlyControlId(): Promise<string> {
    const ids = await this.getControlIds();
    if (ids.length !== 1 || !ids[0]) {
      throw new Error(`Expected exactly one control id, got: ${ids.join(', ')}`);
    }
    return ids[0];
  }

  /** Returns the count of control frames currently rendered. */
  async getCount(): Promise<number> {
    return this.frames.count();
  }

  /**
   * Removes the control identified by `controlId` via its hover-action "delete" button.
   */
  async remove(controlId: string): Promise<void> {
    await this.clickHoverAction(controlId, 'embeddablePanelAction-deletePanel');
  }

  /**
   * Clears all selections from the control identified by `controlId` via its hover-action
   * "clear" button.
   */
  async clearSelections(controlId: string): Promise<void> {
    await this.clickHoverAction(controlId, 'embeddablePanelAction-clearControl');
  }

  /**
   * Hovers over the control's inner element to reveal the hover-action bar, then clicks the
   * action identified by `actionTestSubj`.
   */
  private async clickHoverAction(controlId: string, actionTestSubj: string): Promise<void> {
    await this.getControlElement(controlId).hover();
    const hoverActions = this.page.testSubj.locator(`hover-actions-${controlId}`);
    await hoverActions.waitFor({ state: 'visible' });
    await hoverActions.locator(`[data-test-subj="${actionTestSubj}"]`).click();
  }
}
