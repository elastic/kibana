/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';
import type { Locator, ScoutPage, KibanaUrl } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const spacePrefix = (spaceId?: string) => (spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '');

// EUI table cells append sort/tooltip glyphs on their own line; keep the label.
const firstLine = (text: string) => text.split('\n')[0].trim();

/** Page object for the Saved Objects Management UI. */
export class SavedObjectsManagementPage {
  public readonly table: Locator;
  public readonly selectAllCheckbox: Locator;
  public readonly deleteListButton: Locator;
  public readonly inspectDeleteButton: Locator;
  public readonly inspectSaveButton: Locator;
  public readonly codeEditor: Locator;
  public readonly appNotFoundPageContent: Locator;
  public readonly searchBar: Locator;
  public readonly importTrigger: Locator;
  public readonly importSubmit: Locator;
  public readonly importSuccess: Locator;
  public readonly importNoneImported: Locator;
  public readonly importConflictsWarning: Locator;
  public readonly importConfirmChanges: Locator;
  public readonly importDone: Locator;
  public readonly overwriteConfirmButton: Locator;
  public readonly overwriteCancelButton: Locator;
  public readonly codeEditorWrapper: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.table = this.page.testSubj.locator('savedObjectsTable');
    this.selectAllCheckbox = this.page.testSubj.locator('checkboxSelectAll');
    this.deleteListButton = this.page.testSubj.locator('savedObjectsManagementDelete');
    this.inspectDeleteButton = this.page.testSubj.locator('savedObjectEditDelete');
    this.inspectSaveButton = this.page.testSubj.locator('savedObjectEditSave');
    this.codeEditor = this.page.testSubj.locator('kibanaCodeEditor');
    this.appNotFoundPageContent = this.page.testSubj.locator('appNotFoundPageContent');
    this.searchBar = this.page.testSubj.locator('savedObjectSearchBar');
    this.importTrigger = this.page.testSubj.locator('importObjects');
    this.importSubmit = this.page.testSubj.locator('importSavedObjectsImportBtn');
    this.importSuccess = this.page.testSubj.locator('importSavedObjectsSuccess');
    this.importNoneImported = this.page.testSubj.locator('importSavedObjectsSuccessNoneImported');
    this.importConflictsWarning = this.page.testSubj.locator('importSavedObjectsConflictsWarning');
    this.importConfirmChanges = this.page.testSubj.locator('importSavedObjectsConfirmBtn');
    this.importDone = this.page.testSubj.locator('importSavedObjectsDoneBtn');
    this.overwriteConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.overwriteCancelButton = this.page.testSubj.locator('confirmModalCancelButton');
    this.codeEditorWrapper = new KibanaCodeEditorWrapper(this.page);
  }

  /**
   * Navigates to the SOM listing page. Does NOT wait for the table so the
   * caller can also use it for negative tests (app-not-found / 404).
   */
  async gotoListing(spaceId?: string): Promise<void> {
    await this.page.goto(this.kbnUrl.get(`${spacePrefix(spaceId)}/app/management/kibana/objects`));
  }

  /** Waits for the saved-objects table to render at least one row. */
  async waitForTableLoaded(): Promise<void> {
    await this.table.waitFor({ state: 'visible' });
    await expect(this.page.testSubj.locator('savedObjectsTableRowTitle')).not.toHaveCount(0);
  }

  /** Navigates directly to the SOM inspect view for a specific saved object. */
  async gotoInspect(type: string, id: string, spaceId?: string): Promise<void> {
    await this.page.goto(
      this.kbnUrl.get(`${spacePrefix(spaceId)}/app/management/kibana/objects/${type}/${id}`)
    );
  }

  /** Reads the full Monaco editor model (bypasses viewport virtualisation). */
  async getCodeEditorValue(): Promise<string> {
    await this.codeEditor.waitFor({ state: 'visible' });
    return this.codeEditorWrapper.getCodeEditorValue();
  }

  /** Visible row titles in the table, stripped of EuiLink trailing glyphs. */
  async getRowTitles(): Promise<string[]> {
    await this.waitForTableLoaded();
    const texts = await this.page.testSubj.locator('savedObjectsTableRowTitle').allInnerTexts();
    return texts.map(firstLine);
  }

  /** Types a query into the search bar and submits it. */
  private async typeSearch(query: string): Promise<void> {
    // The SOM search is a QueryStringInput, which syncs through React props:
    // `fill()` races with that sync and can drop characters, so clear the value
    // and type it character by character.
    await this.searchBar.clear();
    await this.searchBar.pressSequentially(query);
    await this.searchBar.press('Enter');
  }

  /** Searches, expecting at least one match, and waits for the table to refilter. */
  async searchFor(query: string): Promise<void> {
    await this.typeSearch(query);
    await this.waitForTableLoaded();
  }

  /** Searches, expecting no match, and waits for the table's empty state. */
  async searchForExpectingNoResults(query: string): Promise<void> {
    await this.typeSearch(query);
    // EuiBasicTable renders a phantom row when empty, so assert on the empty-state
    // copy rather than a zero row count.
    await expect(this.table).toContainText('No items found');
  }

  /**
   * Opens the import flyout and picks the file, without submitting. Use when a
   * test needs to inspect the pre-submit state or change the overwrite mode.
   *
   * `overwrite: false` selects "Request action on conflict", which makes the
   * flyout prompt for each object that already exists instead of replacing it.
   */
  async selectImportFile(
    absoluteFilePath: string,
    { overwrite = true }: { overwrite?: boolean } = {}
  ): Promise<void> {
    await this.importTrigger.click();
    // EuiFilePicker has no stable test-subj; drive its underlying input directly.
    await this.page.locator('input[type="file"][accept=".ndjson"]').setInputFiles(absoluteFilePath);
    if (!overwrite) {
      // The EuiRadio input itself is visually hidden; its label is the hit area.
      await this.page.locator('label[for="overwriteDisabled"]').click();
    }
  }

  /** Submits the import flyout. Does not wait for an outcome. */
  async submitImport(): Promise<void> {
    await this.importSubmit.click();
  }

  /** Imports an .ndjson file via the SOM "Import" flow with overwrite enabled. */
  async importFile(absoluteFilePath: string): Promise<void> {
    await this.selectImportFile(absoluteFilePath);
    await this.submitImport();
    await this.importSuccess.waitFor({ state: 'visible', timeout: 30_000 });
    await this.finishImport();
  }

  /** Dismisses the import summary and returns to the table. */
  async finishImport(): Promise<void> {
    await this.importDone.click();
    await this.table.waitFor({ state: 'visible' });
  }

  /**
   * Resolves a missing-reference conflict by pointing the unresolved data view
   * id at an existing data view, selected by its title.
   */
  async selectReplacementIndexPattern(
    missingIndexPatternId: string,
    replacementTitle: string
  ): Promise<void> {
    await this.page.testSubj
      .locator(`managementChangeIndexSelection-${missingIndexPatternId}`)
      .selectOption({ label: replacementTitle });
  }

  /** Confirms the resolved conflicts. Callers wait for the outcome themselves. */
  async confirmImportChanges(): Promise<void> {
    await this.importConfirmChanges.click();
  }

  /** Opens the row context menu for the given title and clicks "Relationships". */
  async clickRelationshipsByTitle(title: string): Promise<void> {
    const menu = await this.openRowContextMenu(title);
    await menu.locator('[data-test-subj="savedObjectsTableAction-relationships"]').click();
    // The flyout usually lists several rows, so wait on the first match rather
    // than a strict locator.
    await this.page.testSubj.waitForSelector('relationshipsTableRow', { state: 'visible' });
  }

  /** Rows currently listed in the relationships flyout. */
  async getRelationships(): Promise<Array<{ title: string; relationship: string }>> {
    const rows = await this.page.testSubj.locator('relationshipsTableRow').all();
    return Promise.all(
      rows.map(async (row) => ({
        title: firstLine(await row.locator('[data-test-subj="relationshipsTitle"]').innerText()),
        relationship: firstLine(
          await row.locator('[data-test-subj="directRelationship"]').innerText()
        ),
      }))
    );
  }

  /** Saved-object type shown for a table row, read from the type icon's aria-label. */
  async getObjectTypeByTitle(title: string): Promise<string | null> {
    return this.rowByTitle(title)
      .locator('[data-test-subj="objectType"]')
      .getAttribute('aria-label');
  }

  /** Opens the row context menu for the given title and clicks "Inspect". */
  async clickInspectByTitle(title: string): Promise<void> {
    const menu = await this.openRowContextMenu(title);
    await menu.locator('[data-test-subj="savedObjectsTableAction-inspect"]').click();
  }

  /** Opens the row context menu for the given title and clicks "Copy to space". */
  async clickCopyToSpaceByTitle(title: string): Promise<void> {
    const menu = await this.openRowContextMenu(title);
    await menu
      .locator('[data-test-subj="savedObjectsTableAction-copy_saved_objects_to_space"]')
      .click();
  }

  /** Clicks the inspect-view delete button and confirms the modal. */
  async deleteFromInspect(): Promise<void> {
    await this.inspectDeleteButton.waitFor({ state: 'visible' });
    await this.inspectDeleteButton.click();
    const confirmTitle = this.page.testSubj.locator('confirmModalTitleText');
    await confirmTitle.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await confirmTitle.waitFor({ state: 'hidden' });
  }

  /**
   * Table row whose title cell matches `title`. Returned as a locator so specs
   * can await it — the table refreshes asynchronously after an import.
   */
  rowByTitle(title: string): Locator {
    // Anchor on the exact title: a plain `hasText` substring match would also
    // match a row whose title is a superstring (e.g. "logstash" vs "logstash-*"),
    // which then trips Playwright strict mode.
    const titleLocator = this.page.testSubj
      .locator('savedObjectsTableRowTitle')
      .filter({ hasText: new RegExp(`^${escapeRegExp(title)}$`) });
    return this.page
      .locator('[data-test-subj~="savedObjectsTableRow"]')
      .filter({ has: titleLocator });
  }

  private async openRowContextMenu(title: string): Promise<Locator> {
    const row = this.rowByTitle(title);
    await row.waitFor({ state: 'visible' });
    await row.locator('[data-test-subj="euiCollapsedItemActionsButton"]').click();
    const menuPanel = this.page.locator('.euiContextMenuPanel');
    await menuPanel.waitFor({ state: 'visible' });
    return menuPanel;
  }
}
