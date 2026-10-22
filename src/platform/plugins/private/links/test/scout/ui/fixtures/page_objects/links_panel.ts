/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import type { LinksLayoutType } from '../../../../../common/types';

export class LinksPanel {
  public readonly panelEditorFlyout: Locator;
  public readonly linkEditorFlyout: Locator;
  public readonly linksComponent: Locator;
  public readonly linkDestinationError: Locator;

  constructor(private readonly page: ScoutPage) {
    this.panelEditorFlyout = this.page.testSubj.locator('links--panelEditor--flyout');
    this.linkEditorFlyout = this.page.testSubj.locator('links--linkEditor--flyout');
    this.linksComponent = this.page.testSubj.locator('links--component');
    this.linkDestinationError = this.page.testSubj.locator('links--linkDestination--error');
  }

  /** Items rendered by the links panel on the dashboard. */
  getLinksInPanel() {
    return this.page.testSubj.locator('links--component--listGroup').getByRole('listitem');
  }

  /** Link entries listed in the panel editor flyout. */
  getEditorLinks() {
    return this.page.testSubj.locator('links--panelEditor--draggableLink');
  }

  getEditorLink(label: string) {
    return this.getEditorLinks().filter({ hasText: label });
  }

  /** Opens the links panel editor from the (already open) dashboard add panel flyout. */
  async openEditorFromAddPanelFlyout() {
    await this.page.testSubj.click('create-action-Links');
    await this.panelEditorFlyout.waitFor({ state: 'visible' });
  }

  async openLinkEditor() {
    await this.page.testSubj.click('links--panelEditor--addLinkBtn');
    await this.linkEditorFlyout.waitFor({ state: 'visible' });
  }

  async setExternalUrl(destination: string) {
    await this.openLinkEditor();
    await this.page.testSubj
      .locator('links--linkEditor--externalLink--radioBtn')
      .locator('label[for="externalLink"]')
      .click();
    await this.page.testSubj.fill('links--linkEditor--externalLink--input', destination);
  }

  async addExternalLink({
    destination,
    openInNewTab = true,
    encodeUrl = true,
    label,
  }: {
    destination: string;
    openInNewTab?: boolean;
    encodeUrl?: boolean;
    label?: string;
  }) {
    await this.setExternalUrl(destination);
    if (label) {
      await this.page.testSubj.fill('links--linkEditor--linkLabel--input', label);
    }
    await this.page.testSubj.locator('urlDrilldownOpenInNewTab').setChecked(openInNewTab);
    await this.page.testSubj.locator('urlDrilldownEncodeUrl').setChecked(encodeUrl);
    await this.saveLinkEditor();
  }

  async addDashboardLink({
    destination,
    useFilters = true,
    useTimeRange = true,
    openInNewTab = false,
    label,
  }: {
    destination: string;
    useFilters?: boolean;
    useTimeRange?: boolean;
    openInNewTab?: boolean;
    label?: string;
  }) {
    await this.openLinkEditor();
    await this.page.testSubj
      .locator('links--linkEditor--dashboardLink--radioBtn')
      .locator('label[for="dashboardLink"]')
      .click();
    // The destination options are fetched asynchronously while typing, so wait for the exact option
    // rather than relying on the first suggestion.
    await this.page.testSubj
      .locator('links--linkEditor--dashboardLink--comboBox')
      .getByTestId('comboBoxSearchInput')
      .fill(destination);
    await this.page
      .getByRole('option')
      .filter({ hasText: new RegExp(`^${destination}$`) })
      .click();
    if (label) {
      await this.page.testSubj.fill('links--linkEditor--linkLabel--input', label);
    }
    await this.page.testSubj
      .locator('dashboardNavigationOptions--useFilters--checkbox')
      .setChecked(useFilters);
    await this.page.testSubj
      .locator('dashboardNavigationOptions--useTimeRange--checkbox')
      .setChecked(useTimeRange);
    await this.page.testSubj
      .locator('dashboardNavigationOptions--openInNewTab--checkbox')
      .setChecked(openInNewTab);
    await this.saveLinkEditor();
  }

  async saveLinkEditor() {
    await this.page.testSubj.locator('links--linkEditor--saveBtn').click();
    await this.linkEditorFlyout.waitFor({ state: 'hidden' });
  }

  async closeLinkEditor() {
    await this.page.testSubj.click('links--linkEditor--closeBtn');
    await this.linkEditorFlyout.waitFor({ state: 'hidden' });
  }

  async closePanelEditor() {
    await this.page.testSubj.click('links--panelEditor--closeBtn');
    await this.panelEditorFlyout.waitFor({ state: 'hidden' });
  }

  async savePanelEditor() {
    await this.page.testSubj.click('links--panelEditor--saveBtn');
  }

  async setLayout(layout: LinksLayoutType) {
    await this.page.testSubj.click(`links--panelEditor--${layout}LayoutBtn`);
  }

  async setSaveByReference(checked: boolean) {
    await this.page.testSubj
      .locator('links--panelEditor--saveByReferenceSwitch')
      .setChecked(checked);
  }

  async editLink(label: string) {
    const link = this.getEditorLink(label);
    await link.hover();
    await link.getByTestId('panelEditorLink--editBtn').click();
    await this.linkEditorFlyout.waitFor({ state: 'visible' });
  }

  async deleteLink(label: string) {
    const link = this.getEditorLink(label);
    await link.hover();
    await link.getByTestId('panelEditorLink--deleteBtn').click();
  }

  /** Moves a link in the editor using the keyboard drag and drop interaction. */
  async moveLinkUp(label: string, steps: number) {
    const dragHandle = this.getEditorLink(label).getByTestId('panelEditorLink--dragHandle');
    await dragHandle.focus();
    await this.page.keyboard.press('Space');
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press('ArrowUp');
    }
    await this.page.keyboard.press('Space');
  }
}
