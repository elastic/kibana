/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
type SidebarSectionName = 'meta' | 'empty' | 'available' | 'unmapped' | 'popular' | 'selected';
export declare class UnifiedFieldList {
  private readonly page;
  constructor(page: ScoutPage);
  /**
   * Get all field names visible in the sidebar
   */
  getAllFieldNames(): Promise<string[]>;
  /**
   * Get the test subject selector for a sidebar section
   */
  private getSidebarSectionSelector;
  /**
   * Toggle a sidebar section (expand/collapse)
   */
  toggleSidebarSection(sectionName: SidebarSectionName): Promise<void>;
  /**
   * Open a sidebar section if not already open
   */
  openSidebarSection(sectionName: SidebarSectionName): Promise<void>;
  /**
   * Get field names in a specific sidebar section
   */
  getSidebarSectionFieldNames(sectionName: SidebarSectionName): Promise<string[]>;
  waitUntilSidebarHasLoaded(): Promise<void>;
  searchField(name: string): Promise<void>;
  getAvailableFieldCount(): Promise<number>;
  expectAvailableFieldCount(count: number): Promise<void>;
  clearFieldSearch(): Promise<void>;
  openFieldTypeFilter(): Promise<void>;
  closeFieldTypeFilter(): Promise<void>;
  selectFieldTypeFilter(type: string): Promise<void>;
  clearFieldTypeFilters(): Promise<void>;
  getAvailableField(field: string): import('playwright-core').Locator;
  /**
   * Check if a field is selected
   */
  isFieldSelected(field: string): Promise<boolean>;
  /**
   * Add a field to the selected fields
   */
  clickFieldListItemAdd(field: string): Promise<void>;
  /**
   * Remove a field from the selected fields
   */
  clickFieldListItemRemove(field: string): Promise<void>;
  /**
   * Click a field list item to open details
   */
  clickFieldListItem(field: string): Promise<void>;
  openFieldEditor(field: string): Promise<void>;
}
export {};
