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

interface CreateDataViewOptions {
  /** Index pattern title (e.g. `'logstash'`); a `*` is appended automatically. */
  name: string;
  /** Pass `true` for an ad-hoc (temporary) data view via the "Use without saving" flow. */
  adHoc?: boolean;
  /** Pass `true` if the data view has a `@timestamp` field. */
  hasTimeField?: boolean;
  /** Optional explicit timestamp field to select in the combo box. */
  changeTimestampField?: string;
}

/**
 * Page object for the top-search-bar Data View switcher and the
 * "Create / edit data view" flyout it opens. Mirrors the subset of FTR
 * `dataViews` service used by Discover-side tests (open switcher, create
 * persisted or ad-hoc data view, switch between data views, open the
 * "add field" flyout).
 *
 * The corresponding "Stack management → Data views" management *page* is
 * already covered by `DataViewsManagementPage`; this PO is the in-app
 * counterpart used from Discover, Dashboard, etc.
 */
export class DataViews {
  private readonly switcherLink;
  private readonly switcherPanel;
  private readonly switcherInput;
  private readonly editorFlyout;
  private readonly titleInput;
  private readonly timestampField;
  private readonly saveButton;
  private readonly exploreButton;

  constructor(private readonly page: ScoutPage) {
    // The button is rendered as `<id>dataView-switch-link` (e.g.
    // `discover-dataView-switch-link`). Use the `*` whole-attribute prefix
    // matcher so this PO works across apps without knowing the prefix.
    this.switcherLink = page.testSubj.locator('*dataView-switch-link');
    this.switcherPanel = page.testSubj.locator('indexPattern-switcher');
    this.switcherInput = page.testSubj.locator('indexPattern-switcher--input');
    this.editorFlyout = page.testSubj.locator('indexPatternEditorFlyout');
    this.titleInput = page.testSubj.locator('createIndexPatternTitleInput');
    this.timestampField = page.testSubj.locator('timestampField');
    this.saveButton = page.testSubj.locator('saveIndexPatternButton');
    this.exploreButton = page.testSubj.locator('exploreIndexPatternButton');
  }

  /** Visible text of the currently-selected data view in the switcher button. */
  async getSelectedName(): Promise<string> {
    return (await this.switcherLink.textContent())?.trim() ?? '';
  }

  /** Open the in-app data view switcher popover. No-op if already open. */
  private async openSwitcher(): Promise<void> {
    if (await this.switcherPanel.isVisible()) {
      return;
    }
    await this.switcherLink.click();
    await expect(this.switcherPanel).toBeVisible();
  }

  /**
   * Create a new data view from the top search bar switcher. Mirrors FTR
   * `dataViews.createFromSearchBar({ name, adHoc, hasTimeField })`.
   */
  async createFromSearchBar({
    name,
    adHoc = false,
    hasTimeField = false,
    changeTimestampField,
  }: CreateDataViewOptions): Promise<void> {
    await this.openSwitcher();
    await this.page.testSubj.click('dataview-create-new');
    await expect(this.editorFlyout).toBeVisible();

    // Fill the title and wait for async pattern-validation to settle. The
    // input flips `data-is-validating` 0↔1 while the request is in flight.
    await this.titleInput.fill(name);
    await expect(this.titleInput).toHaveAttribute('data-is-validating', '0', { timeout: 30_000 });
    await expect(this.titleInput).not.toHaveAttribute('aria-invalid', 'true');

    // Wait until the timestamp combobox finishes loading (it queries the
    // index for date fields). Then either pick the matching field, force
    // "no time field", or leave it on the default (`@timestamp`).
    await expect(this.timestampField).toHaveAttribute('data-is-loading', '0', { timeout: 30_000 });
    const timestampInput = this.timestampField.locator(
      'input[data-test-subj="comboBoxSearchInput"]'
    );
    if (await timestampInput.isEnabled()) {
      if (!hasTimeField) {
        await this.selectTimestampField("--- I don't want to use the time filter ---");
      } else if (changeTimestampField) {
        await this.selectTimestampField(changeTimestampField);
      }
    }

    if (adHoc) {
      await this.exploreButton.click();
    } else {
      await this.saveButton.click();
    }
    await expect(this.editorFlyout).toBeHidden({ timeout: 30_000 });
  }

  /**
   * Switch to an existing data view via the search-bar switcher. Mirrors
   * FTR `dataViews.switchTo(name)`.
   */
  async switchTo(name: string): Promise<void> {
    if ((await this.getSelectedName()) === name) {
      return;
    }
    await this.openSwitcher();
    await this.switcherInput.fill(name);
    await this.page.locator(`[data-test-subj="indexPattern-switcher"] [title="${name}"]`).click();
    await expect.poll(() => this.getSelectedName(), { timeout: 15_000 }).toBe(name);
  }

  /**
   * Open the "Create field" flyout for the currently-selected data view.
   * Mirrors FTR `dataViews.clickAddFieldFromSearchBar()`. Caller is
   * responsible for closing the flyout (e.g. via {@link DataViewsFieldEditor.save}).
   */
  async clickAddFieldFromSearchBar(): Promise<void> {
    await this.openSwitcher();
    await this.page.testSubj.click('indexPattern-add-field');
    await expect(this.page.testSubj.locator('fieldEditor')).toBeVisible();
  }

  private async selectTimestampField(label: string): Promise<void> {
    const toggle = this.timestampField.locator('[data-test-subj="comboBoxToggleListButton"]');
    await toggle.click();
    // The combo-box options portal is rendered at the document root; match
    // by exact role+name to avoid colliding with stale options from the
    // pattern-input dropdown above.
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }
}
