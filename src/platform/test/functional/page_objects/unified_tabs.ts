/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class UnifiedTabsPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly browser = this.ctx.getService('browser');

  public async getTabElements() {
    return await this.find.allByCssSelector('[data-test-subj^="unifiedTabs_tab_"]');
  }

  public async getSelectedTab(): Promise<
    { element: WebElementWrapper; index: number; label: string } | undefined
  > {
    const tabElements = await this.getTabElements();
    for (const tabElement of tabElements) {
      const tabRoleElement = await tabElement.findByCssSelector('[role="tab"]');
      if ((await tabRoleElement.getAttribute('aria-selected')) === 'true') {
        const labelTextElement = await tabElement.findByTestSubject('fullText');
        return {
          element: tabElement,
          index: tabElements.indexOf(tabElement),
          label: await labelTextElement.getVisibleText(),
        };
      }
    }
  }

  public async getTabWidths() {
    const tabElements = await this.getTabElements();
    return await Promise.all(
      tabElements.map(async (tabElement) => {
        return (await tabElement.getSize()).width;
      })
    );
  }

  public async getTabLabels() {
    const tabElements = await this.getTabElements();
    return await Promise.all(
      tabElements.map(async (tabElement) => {
        const labelTextElement = await tabElement.findByTestSubject('fullText');
        return await labelTextElement.getVisibleText();
      })
    );
  }

  public async getNumberOfTabs() {
    const numberOfTabs = await this.getTabElements();
    return numberOfTabs.length;
  }

  public async hideTabPreview() {
    await this.testSubjects.moveMouseTo('breadcrumbs');
  }

  public async createNewTab() {
    const numberOfTabs = await this.getNumberOfTabs();
    await this.testSubjects.click('unifiedTabs_tabsBar_newTabBtn');
    await this.retry.waitFor('the new tab to appear', async () => {
      const newNumberOfTabs = await this.getNumberOfTabs();
      return (
        newNumberOfTabs === numberOfTabs + 1 &&
        (await this.getSelectedTab())?.index === newNumberOfTabs - 1
      );
    });
    await this.hideTabPreview();
  }

  public async selectTab(index: number) {
    const tabElements = await this.getTabElements();
    if (index < 0 || index >= tabElements.length) {
      throw new Error(`Tab index ${index} is out of bounds`);
    }
    await tabElements[index].click();
    await this.retry.waitFor('the selected tab to change', async () => {
      return (await this.getSelectedTab())?.index === index;
    });
    await this.hideTabPreview();
  }

  public async closeTab(index: number) {
    const tabElements = await this.getTabElements();
    if (index < 0 || index >= tabElements.length) {
      throw new Error(`Tab index ${index} is out of bounds`);
    }
    const closeButton = await tabElements[index].findByCssSelector(
      '[data-test-subj^="unifiedTabs_closeTabBtn_"]'
    );
    await closeButton.click();
    await this.retry.waitFor('the tab to be closed', async () => {
      return (await this.getNumberOfTabs()) === tabElements.length - 1;
    });
  }

  public async openTabMenu(index: number) {
    const tabElements = await this.getTabElements();
    if (index < 0 || index >= tabElements.length) {
      throw new Error(`Tab index ${index} is out of bounds`);
    }
    const menuButton = await tabElements[index].findByCssSelector(
      '[data-test-subj^="unifiedTabs_tabMenuBtn_"]'
    );
    await menuButton.click();
    await this.retry.waitFor('the menu to open', async () => {
      return (await this.getContextMenuItems()).length > 0;
    });
  }

  public async duplicateTab(index: number) {
    const tabElements = await this.getTabElements();
    if (index < 0 || index >= tabElements.length) {
      throw new Error(`Tab index ${index} is out of bounds`);
    }
    await this.openTabMenu(index);
    const duplicateButton = await this.testSubjects.find('unifiedTabs_tabMenuItem_duplicate');
    await duplicateButton.click();
    await this.retry.waitFor('the new tab to appear after duplication', async () => {
      const newNumberOfTabs = await this.getNumberOfTabs();
      return newNumberOfTabs === tabElements.length + 1;
    });
    await this.retry.waitFor('the duplicated tab to be selected', async () => {
      const selectedTab = await this.getSelectedTab();
      return selectedTab?.index === index + 1;
    });
  }

  public async enterNewTabLabel(newLabel: string) {
    await this.retry.waitFor('the tab label to be editable', async () => {
      return Boolean(
        await this.find.byCssSelector('[data-test-subj^="unifiedTabs_editTabLabelInput_"]')
      );
    });
    const labelElement = await this.find.byCssSelector(
      '[data-test-subj^="unifiedTabs_editTabLabelInput_"]'
    );
    await labelElement.clearValue();
    await labelElement.type(newLabel, { charByChar: true });
    await this.browser.pressKeys(this.browser.keys.ENTER);
    await this.retry.waitFor('the tab label to change', async () => {
      return (await this.getSelectedTab())?.label === newLabel;
    });
  }

  public async editTabLabel(index: number, newLabel: string) {
    const tabElements = await this.getTabElements();
    if (index < 0 || index >= tabElements.length) {
      throw new Error(`Tab index ${index} is out of bounds`);
    }
    const tabElement = tabElements[index];
    const controlElement = await tabElement.findByCssSelector(
      '[data-test-subj^="unifiedTabs_selectTabBtn_"]'
    );
    await controlElement.doubleClick();
    await this.enterNewTabLabel(newLabel);
  }

  public async getContextMenuItems() {
    let items: string[] = [];

    await this.retry.waitFor('context menu items to appear', async () => {
      items = [];
      const contextMenuItems = await this.find.allByCssSelector(
        '[data-test-subj^="unifiedTabs_tabMenuItem"]'
      );
      for (const item of contextMenuItems) {
        items.push(await item.getVisibleText());
      }

      return items.length > 0;
    });

    return items;
  }

  public async isScrollable() {
    return (
      (await this.testSubjects.exists('unifiedTabs_tabsBar_scrollLeftBtn')) &&
      (await this.testSubjects.exists('unifiedTabs_tabsBar_scrollRightBtn'))
    );
  }

  public async canScrollMoreLeft() {
    const scrollLeftBtn = await this.testSubjects.find('unifiedTabs_tabsBar_scrollLeftBtn');
    return !(await scrollLeftBtn.getAttribute('disabled'));
  }

  public async canScrollMoreRight() {
    const scrollRightBtn = await this.testSubjects.find('unifiedTabs_tabsBar_scrollRightBtn');
    return !(await scrollRightBtn.getAttribute('disabled'));
  }

  public async waitForScrollButtons() {
    await this.retry.waitFor('scroll buttons to get ready', async () => {
      return (
        (await this.isScrollable()) &&
        ((await this.canScrollMoreLeft()) || (await this.canScrollMoreRight()))
      );
    });
  }

  public async isTabsBarVisible() {
    return await this.testSubjects.exists('unifiedTabs_tabsBar');
  }

  public async openTabsBarMenu() {
    await this.testSubjects.click('unifiedTabs_tabsBarMenuButton');
    await this.retry.waitFor('the tabs bar menu to open', async () => {
      return await this.testSubjects.exists('unifiedTabs_tabsBarMenuPanel');
    });
  }

  public async closeTabsBarMenu() {
    await this.testSubjects.click('unifiedTabs_tabsBarMenuButton');
    await this.retry.waitFor('the tabs bar menu to close', async () => {
      return !(await this.testSubjects.exists('unifiedTabs_tabsBarMenuPanel'));
    });
    await this.browser.pressKeys(this.browser.keys.ESCAPE); // cancel the tooltip if it is open
  }

  public async getRecentlyClosedTabLabels() {
    await this.openTabsBarMenu();
    const recentlyClosedItems = await this.find.allByCssSelector(
      '[data-test-subj^="unifiedTabs_tabsMenu_recentlyClosedTab_"]'
    );
    const labels = [];
    for (const item of recentlyClosedItems) {
      labels.push(await item.getVisibleText());
    }
    await this.closeTabsBarMenu();
    return labels;
  }

  public async restoreRecentlyClosedTab(index: number) {
    const currentNumberOfTabs = await this.getNumberOfTabs();
    await this.openTabsBarMenu();
    const recentlyClosedItems = await this.find.allByCssSelector(
      '[data-test-subj^="unifiedTabs_tabsMenu_recentlyClosedTab_"]'
    );
    if (index < 0 || index >= recentlyClosedItems.length) {
      throw new Error(`Recently closed tab index ${index} is out of bounds`);
    }
    await recentlyClosedItems[index].click();
    await this.retry.waitFor('the tab to be restored', async () => {
      const newNumberOfTabs = await this.getNumberOfTabs();
      return newNumberOfTabs === currentNumberOfTabs + 1;
    });
  }

  public async clearRecentlyClosedTabs() {
    await this.openTabsBarMenu();
    const buttonTestId = 'unifiedTabs_tabsMenu_clearRecentlyClosed';
    const clearButtonExists = await this.testSubjects.exists(buttonTestId);
    if (clearButtonExists) {
      await this.testSubjects.click(buttonTestId);
      await this.retry.waitFor('recently closed tabs to be cleared', async () => {
        return !(await this.testSubjects.exists(buttonTestId));
      });
    }
    await this.closeTabsBarMenu();
  }
}
