/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';

const META_FIELDS = ['_score', '_id', '_index'];

/**
 * Scout page object for the Unified Field List sidebar used by Discover,
 * Dashboard, Timelines, etc. Mirrors the subset of FTR
 * `unified_field_list` PageObject methods that the migrated discover tests
 * exercise — adding/removing sidebar fields and reading the field list.
 */
export class UnifiedFieldList {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Wait until the sidebar has finished loading. The sidebar exposes its
   * loaded state via the aria-description on its container; we wait for the
   * grouped-field groups list to be visible as a proxy.
   */
  async waitUntilSidebarHasLoaded(): Promise<void> {
    await this.page.testSubj.waitForSelector('fieldListGroupedFieldGroups', {
      state: 'visible',
      timeout: 30_000,
    });
  }

  /**
   * Whether `fieldName` is currently in the "Selected fields" group of the
   * sidebar. Returns `false` if the selected-fields group is not even
   * rendered (i.e. nothing has been added yet).
   */
  async isFieldSelected(fieldName: string): Promise<boolean> {
    const selectedGroup = this.page.testSubj.locator('fieldListGroupedSelectedFields');
    if (!(await selectedGroup.isVisible())) {
      return false;
    }
    return await selectedGroup.locator(`[data-test-subj="field-${fieldName}"]`).isVisible();
  }

  private async toggleMetaSection(): Promise<void> {
    // The "Meta" accordion holds `_score`, `_id`, `_index`. It is collapsed by
    // default; expand it if needed before clicking the per-field toggle.
    //
    // EuiAccordion renders two `button[aria-expanded]` inside the section:
    // a visually-hidden arrow button (`aria-hidden="true"`) and the labelled
    // accordion button. We target the labelled one by excluding the hidden
    // arrow so the locator resolves to exactly one element.
    const sectionContainer = this.page.testSubj.locator('fieldListGroupedMetaFields');
    const toggleButton = sectionContainer.locator(
      'button[aria-expanded]:not([aria-hidden="true"])'
    );
    if ((await toggleButton.getAttribute('aria-expanded')) === 'false') {
      await toggleButton.click();
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    }
  }

  /**
   * The grouped-field container that holds `fieldName`. Most fields live in
   * the "Available" group, but Discover also promotes a configurable number
   * of fields into a "Popular" group that is a *duplicate* of the underlying
   * Available entry. Returning a single deterministic container avoids
   * strict-mode locator violations on the per-field toggle/test-subj.
   */
  private fieldGroupContainer(fieldName: string) {
    if (META_FIELDS.includes(fieldName)) {
      return this.page.testSubj.locator('fieldListGroupedMetaFields');
    }
    return this.page.testSubj.locator('fieldListGroupedAvailableFields');
  }

  /**
   * Click the "+" toggle on a sidebar field to add it as a grid column.
   * No-op if the field is already in the selected group.
   */
  async clickFieldListItemAdd(fieldName: string): Promise<void> {
    await this.waitUntilSidebarHasLoaded();
    if (await this.isFieldSelected(fieldName)) {
      return;
    }
    if (META_FIELDS.includes(fieldName)) {
      await this.toggleMetaSection();
    }
    const toggle = this.fieldGroupContainer(fieldName).locator(
      `[data-test-subj="fieldToggle-${fieldName}"]`
    );
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect.poll(() => this.isFieldSelected(fieldName), { timeout: 15_000 }).toBe(true);
  }

  /**
   * Click the "−" toggle on a sidebar field to remove it as a grid column.
   * No-op if the field isn't currently selected.
   */
  async clickFieldListItemRemove(fieldName: string): Promise<void> {
    await this.waitUntilSidebarHasLoaded();
    if (!(await this.isFieldSelected(fieldName))) {
      return;
    }
    // When removing, the field is in the Selected group at the top of the
    // sidebar — that toggle is unique by construction.
    const toggle = this.page.testSubj
      .locator('fieldListGroupedSelectedFields')
      .locator(`[data-test-subj="fieldToggle-${fieldName}"]`);
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect.poll(() => this.isFieldSelected(fieldName), { timeout: 15_000 }).toBe(false);
  }

  /**
   * Read all field display names currently rendered in the sidebar's
   * grouped-field section. Each field button exposes its display name as the
   * text of its `[data-test-subj="field-${field.name}"]` element
   * (see `field_item_button.tsx`).
   */
  async getAllFieldNames(): Promise<string[]> {
    await this.waitUntilSidebarHasLoaded();
    const sidebar = this.page.testSubj.locator('fieldListGroupedFieldGroups');
    return sidebar
      .locator('[data-test-subj^="field-"]')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).innerText.trim()));
  }
}
