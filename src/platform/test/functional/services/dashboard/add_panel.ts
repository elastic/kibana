/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../../ftr_provider_context';

export class DashboardAddPanelService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly savedObjectsFinder = this.ctx.getService('savedObjectsFinder');
  private readonly browser = this.ctx.getService('browser');
  private readonly toasts = this.ctx.getService('toasts');

  async clickOpenAddPanel() {
    this.log.debug('DashboardAddPanel.clickOpenAddPanel');
    await this.testSubjects.click('dashboardAddFromLibraryButton');
    // Give some time for the animation to complete
    await this.common.sleep(500);
  }

  async clickCreateNewLink() {
    this.log.debug('DashboardAddPanel.clickAddNewPanelButton');
    await this.retry.try(async () => {
      // prevent query bar auto suggest from blocking button
      await this.browser.pressKeys(this.browser.keys.ESCAPE);
      await this.testSubjects.click('dashboardAddNewPanelButton');
      await this.testSubjects.waitForDeleted('dashboardAddNewPanelButton');
      await this.header.waitUntilLoadingHasFinished();
      await this.testSubjects.existOrFail('lnsApp', {
        timeout: 5000,
      });
    });
  }

  async clickAddMarkdownPanel() {
    await this.clickEditorMenuButton();
    await this.clickAddNewPanelFromUIActionLink('Markdown text');
  }

  async clickAddMapPanel() {
    await this.clickEditorMenuButton();
    await this.clickAddNewPanelFromUIActionLink('Maps');
  }

  async clickAddLensPanel() {
    await this.clickEditorMenuButton();
    await this.clickAddNewPanelFromUIActionLink('Lens');
  }

  async clickEditorMenuButton() {
    this.log.debug('DashboardAddPanel.clickEditorMenuButton');
    await this.testSubjects.click('dashboardEditorMenuButton');
    await this.testSubjects.existOrFail('dashboardPanelSelectionFlyout');
    await this.retry.try(async () => {
      return await this.testSubjects.exists('dashboardPanelSelectionList');
    });
  }

  async expectEditorMenuClosed() {
    await this.testSubjects.missingOrFail('dashboardPanelSelectionFlyout');
  }

  async verifyEmbeddableFactoryGroupExists(groupId: string, expectExist: boolean = true) {
    this.log.debug('DashboardAddPanel.verifyEmbeddableFactoryGroupExists');
    const testSubject = `dashboardEditorMenu-${groupId}Group`;
    if (expectExist) {
      await this.testSubjects.existOrFail(testSubject);
    } else {
      await this.testSubjects.missingOrFail(testSubject);
    }
  }

  async clickAddNewEmbeddableLink(type: string) {
    await this.testSubjects.click(`createNew-${type}`);
  }

  async clickAddNewPanelFromUIActionLink(type: string) {
    await this.testSubjects.setValue('dashboardPanelSelectionFlyout__searchInput', type);
    await this.testSubjects.click(`create-action-${type}`);
  }

  async addEveryEmbeddableOnCurrentPage() {
    this.log.debug('addEveryEmbeddableOnCurrentPage');
    const itemList = await this.testSubjects.find('savedObjectsFinderTable');
    const embeddableList: string[] = [];
    await this.retry.try(async () => {
      const embeddableListBody = await itemList.findByTagName('tbody');
      const embeddableRows = await embeddableListBody.findAllByCssSelector('tr');
      for (let i = 0; i < embeddableRows.length; i++) {
        const { name, button } = await this.savedObjectsFinder.getRowAtIndex(embeddableRows, i);
        if (embeddableList.includes(name)) {
          // already added this one
          continue;
        }
        await button.click();

        embeddableList.push(name);
      }
    });
    this.log.debug(`Added ${embeddableList.length} embeddables`);
    return embeddableList;
  }

  async clickPagerNextButton() {
    // Clear all toasts that could hide pagination controls
    await this.toasts.dismissAll();

    const addPanel = await this.testSubjects.find('dashboardAddPanel');

    const isNext = await this.testSubjects.descendantExists('pagination-button-next', addPanel);
    if (!isNext) {
      return false;
    }

    const pagerNextButton = await this.testSubjects.findDescendant(
      'pagination-button-next',
      addPanel
    );

    const isDisabled = await pagerNextButton.getAttribute('disabled');
    if (isDisabled != null) {
      return false;
    }

    await this.header.waitUntilLoadingHasFinished();
    await pagerNextButton.click();
    await this.header.waitUntilLoadingHasFinished();
    return true;
  }

  async isAddPanelOpen() {
    this.log.debug('DashboardAddPanel.isAddPanelOpen');
    return await this.testSubjects.exists('dashboardAddPanel', { timeout: 500 });
  }

  async ensureAddPanelIsShowing() {
    this.log.debug('DashboardAddPanel.ensureAddPanelIsShowing');
    const isOpen = await this.isAddPanelOpen();
    if (!isOpen) {
      await this.retry.try(async () => {
        await this.clickOpenAddPanel();
        const isNowOpen = await this.isAddPanelOpen();
        if (!isNowOpen) {
          throw new Error('Add panel still not open, trying again.');
        }
      });
    }
  }

  async ensureAddPanelIsClosed() {
    this.log.debug('DashboardAddPanel.ensureAddPanelIsClosed');
    const isOpen = await this.isAddPanelOpen();
    if (isOpen) {
      await this.retry.try(async () => {
        await this.closeAddPanel();
        const isNowOpen = await this.isAddPanelOpen();
        if (isNowOpen) {
          throw new Error('Add panel still open, trying again.');
        }
      });
    }
  }

  async closeAddPanel() {
    await this.flyout.ensureAllClosed();
  }

  async filterEmbeddableNames(name: string) {
    await this.savedObjectsFinder.filterEmbeddableNames(name);
  }

  async addEveryVisualization(filter: string) {
    this.log.debug('DashboardAddPanel.addEveryVisualization');
    await this.ensureAddPanelIsShowing();
    if (filter) {
      await this.filterEmbeddableNames(filter.replace('-', ' '));
    }
    await this.savedObjectsFinder.waitForFilter('Visualization', 'search');
    let morePages = true;
    const vizList: string[][] = [];
    while (morePages) {
      vizList.push(await this.addEveryEmbeddableOnCurrentPage());
      morePages = await this.clickPagerNextButton();
    }
    await this.closeAddPanel();
    return vizList.reduce((acc, list) => [...acc, ...list], []);
  }

  async addEverySavedSearch(filter: string) {
    this.log.debug('DashboardAddPanel.addEverySavedSearch');
    await this.ensureAddPanelIsShowing();
    const searchList = [];
    if (filter) {
      await this.filterEmbeddableNames(filter.replace('-', ' '));
    }
    await this.savedObjectsFinder.waitForFilter('Saved search', 'Visualization');
    let morePages = true;
    while (morePages) {
      searchList.push(await this.addEveryEmbeddableOnCurrentPage());
      morePages = await this.clickPagerNextButton();
    }
    await this.closeAddPanel();
    return searchList.reduce((acc, list) => [...acc, ...list], []);
  }

  async addSavedSearch(searchName: string) {
    return this.addEmbeddable(searchName, 'search');
  }

  async addSavedSearches(searches: string[]) {
    for (const name of searches) {
      await this.addSavedSearch(name);
    }
  }

  async addVisualizations(visualizations: string[]) {
    this.log.debug('DashboardAddPanel.addVisualizations');
    const vizList = [];
    for (const vizName of visualizations) {
      await this.addVisualization(vizName);
      vizList.push(vizName);
    }
    return vizList;
  }

  async addVisualization(vizName: string) {
    this.log.debug(`DashboardAddPanel.addVisualization, ${vizName}`);
    return this.addEmbeddable(vizName, 'Visualization');
  }

  async addEmbeddable(
    embeddableName: string,
    embeddableType?: string,
    closePanelWhenComplete: boolean = true
  ) {
    this.log.debug(
      `DashboardAddPanel.addEmbeddable, name: ${embeddableName}, type: ${embeddableType}`
    );
    await this.ensureAddPanelIsShowing();
    await this.savedObjectsFinder.filterEmbeddableNames(
      `${embeddableType ? 'type:(' + embeddableType + ') ' : ''}"${embeddableName.replace(
        '-',
        ' '
      )}"`
    );
    await this.testSubjects.click(`savedObjectTitle${embeddableName.split(' ').join('-')}`);
    await this.testSubjects.exists('addObjectToDashboardSuccess');
    if (closePanelWhenComplete) {
      await this.closeAddPanel();
    }

    // close "Added successfully" toast
    await this.toasts.dismissAll();
    return embeddableName;
  }

  async addEmbeddables(embeddables: Array<{ name: string; type?: string }>) {
    const addedEmbeddables: string[] = [];
    for (const { name, type } of embeddables) {
      addedEmbeddables.push(await this.addEmbeddable(name, type, false));
    }
    await this.closeAddPanel();
    return addedEmbeddables;
  }

  async panelAddLinkExists(name: string) {
    this.log.debug(`DashboardAddPanel.panelAddLinkExists(${name})`);
    await this.ensureAddPanelIsShowing();
    await this.savedObjectsFinder.filterEmbeddableNames(`"${name}"`);
    return await this.testSubjects.exists(`savedObjectTitle${name.split(' ').join('-')}`);
  }
}
