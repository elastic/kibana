/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

type SidebarSectionName = 'meta' | 'empty' | 'available' | 'unmapped' | 'popular' | 'selected';

export class UnifiedFieldList {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Get all field names visible in the sidebar
   */
  async getAllFieldNames(): Promise<string[]> {
    const sidebar = this.page.testSubj.locator('fieldListGroupedFieldGroups');
    await sidebar.waitFor();

    const fieldButtons = sidebar.locator('.kbnFieldButton__name');
    const names = await fieldButtons.allTextContents();

    return names.filter((name) => name.trim() !== '');
  }

  /**
   * Get the test subject selector for a sidebar section
   */
  private getSidebarSectionSelector(sectionName: SidebarSectionName): string {
    return `fieldListGrouped${sectionName[0].toUpperCase()}${sectionName.substring(1)}Fields`;
  }

  /**
   * Toggle a sidebar section (expand/collapse)
   */
  async toggleSidebarSection(sectionName: SidebarSectionName): Promise<void> {
    const sectionSelector = this.getSidebarSectionSelector(sectionName);
    const section = this.page.testSubj.locator(sectionSelector);
    const arrow = section.locator('.euiAccordion__arrow');
    await arrow.click();
  }

  /**
   * Open a sidebar section if not already open
   */
  async openSidebarSection(sectionName: SidebarSectionName): Promise<void> {
    const sectionSelector = this.getSidebarSectionSelector(sectionName);
    const section = this.page.testSubj.locator(sectionSelector);

    const isOpen = await section.evaluate((el) => el.classList.contains('euiAccordion-isOpen'));

    if (!isOpen) {
      await this.toggleSidebarSection(sectionName);
      // Wait for it to be open
      await section.locator('.euiAccordion-isOpen').waitFor();
    }
  }

  /**
   * Get field names in a specific sidebar section
   */
  async getSidebarSectionFieldNames(sectionName: SidebarSectionName): Promise<string[]> {
    await this.waitUntilSidebarHasLoaded();
    const sectionSelector = this.getSidebarSectionSelector(sectionName);
    const section = this.page.testSubj.locator(sectionSelector);

    const fields = section.locator('li[data-attr-field]');
    const elements = await fields.all();

    const names: string[] = [];
    for (const element of elements) {
      const name = await element.getAttribute('data-attr-field');
      if (name) {
        names.push(name);
      }
    }

    return names;
  }

  async waitUntilSidebarHasLoaded(): Promise<void> {
    await this.page.testSubj.waitForSelector('fieldListGroupedAvailableFields-countLoading', {
      state: 'hidden',
    });
  }

  async searchField(name: string): Promise<void> {
    await this.waitUntilSidebarHasLoaded();
    const searchInput = this.page.testSubj.locator('fieldListFiltersFieldSearch');
    await searchInput.fill(name);
    await expect(searchInput).toHaveValue(name);
    await this.waitUntilSidebarHasLoaded();
  }

  async getAvailableFieldCount(): Promise<number> {
    await this.waitUntilSidebarHasLoaded();
    const text = await this.page.testSubj
      .locator('fieldListGroupedAvailableFields-count')
      .innerText();

    return Number(text.trim());
  }

  async expectAvailableFieldCount(count: number): Promise<void> {
    await this.waitUntilSidebarHasLoaded();
    await expect(this.page.testSubj.locator('fieldListGroupedAvailableFields-count')).toHaveText(
      String(count)
    );
  }

  async clearFieldSearch(): Promise<void> {
    await this.searchField('');
  }

  async openFieldTypeFilter(): Promise<void> {
    await this.page.testSubj.locator('fieldListFiltersFieldTypeFilterToggle').click();
    await this.page.testSubj
      .locator('fieldListFiltersFieldTypeFilterOptions')
      .waitFor({ state: 'visible' });
  }

  async closeFieldTypeFilter(): Promise<void> {
    await this.page.testSubj.locator('fieldListFiltersFieldTypeFilterToggle').click();
    await this.page.testSubj
      .locator('fieldListFiltersFieldTypeFilterOptions')
      .waitFor({ state: 'hidden' });
  }

  async selectFieldTypeFilter(type: string): Promise<void> {
    await this.page.testSubj.locator(`typeFilter-${type}`).click();
  }

  async clearFieldTypeFilters(): Promise<void> {
    await this.openFieldTypeFilter();
    await this.page.testSubj.locator('fieldListFiltersFieldTypeFilterClearAll').click();
    await this.closeFieldTypeFilter();
  }

  getAvailableField(field: string) {
    return this.page.testSubj
      .locator('fieldListGroupedAvailableFields')
      .locator(`[data-test-subj="field-${field}"]`);
  }

  /**
   * Check if a field is selected
   */
  async isFieldSelected(field: string): Promise<boolean> {
    const selectedSection = this.page.testSubj.locator('fieldListGroupedSelectedFields');

    if (!(await selectedSection.isVisible({ timeout: 1000 }).catch(() => false))) {
      return false;
    }

    const fieldLocator = selectedSection.locator(`[data-test-subj="field-${field}"]`);
    return await fieldLocator.isVisible({ timeout: 1000 }).catch(() => false);
  }

  /**
   * Add a field to the selected fields
   */
  async clickFieldListItemAdd(field: string): Promise<void> {
    if (await this.isFieldSelected(field)) {
      return;
    }

    if (['_score', '_id', '_index'].includes(field)) {
      await this.toggleSidebarSection('meta'); // expand Meta section
    }

    await this.page.testSubj.click(`fieldToggle-${field}`);

    // Wait for field to be selected
    await this.page.waitForFunction(async (fieldName) => {
      const selectedSection = document.querySelector(
        '[data-test-subj="fieldListGroupedSelectedFields"]'
      );
      if (!selectedSection) return false;
      return !!selectedSection.querySelector(`[data-test-subj="field-${fieldName}"]`);
    }, field);
  }

  /**
   * Remove a field from the selected fields
   */
  async clickFieldListItemRemove(field: string): Promise<void> {
    if (!(await this.isFieldSelected(field))) {
      return;
    }

    await this.page.testSubj.click(`fieldToggle-${field}`);

    await this.page.testSubj
      .locator('fieldListGroupedSelectedFields')
      .locator(`[data-test-subj="field-${field}"]`)
      .waitFor({ state: 'hidden' });
  }

  /**
   * Click a field list item to open details
   */
  async clickFieldListItem(field: string): Promise<void> {
    await this.page.testSubj.click(`field-${field}`);
  }

  async openFieldEditor(field: string): Promise<void> {
    await this.searchField(field);
    await expect(this.getAvailableField(field)).toBeVisible();
    await this.getAvailableField(field).click();
    await this.page.locator('[data-popover-open="true"]').waitFor({ state: 'visible' });
    await this.page.testSubj.locator(`discoverFieldListPanelEdit-${field}`).click();
    await this.page.testSubj.locator('fieldEditor').waitFor({ state: 'visible' });
  }
}
