/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page, test as base } from '@playwright/test';
import { subj } from '@kbn/test-subj-selector';
import { ScoutPage } from '../types';

function extendPageWithTestSubject(page: Page) {
  return {
    check: async (selector: string, options?: Parameters<Page['check']>[1]) => {
      return page.check(subj(selector), options);
    },
    click: async (selector: string, options?: Parameters<Page['click']>[1]) => {
      return page.click(subj(selector), options);
    },
    dblclick: async (selector: string, options?: Parameters<Page['dblclick']>[1]) => {
      return page.dblclick(subj(selector), options);
    },
    fill: async (selector: string, value: string, options?: Parameters<Page['fill']>[2]) => {
      return page.fill(subj(selector), value, options);
    },
    focus: async (selector: string, options?: Parameters<Page['focus']>[1]) => {
      return page.focus(subj(selector), options);
    },
    getAttribute: async (
      selector: string,
      name: string,
      options?: Parameters<Page['getAttribute']>[2]
    ) => {
      return page.getAttribute(subj(selector), name, options);
    },
    hover: async (selector: string, options?: Parameters<Page['hover']>[1]) => {
      return page.hover(subj(selector), options);
    },
    isEnabled: async (selector: string, options?: Parameters<Page['isEnabled']>[1]) => {
      return page.isEnabled(subj(selector), options);
    },
    innerText: async (selector: string, options?: Parameters<Page['innerText']>[1]) => {
      return page.innerText(subj(selector), options);
    },
    isChecked: async (selector: string, options?: Parameters<Page['isChecked']>[1]) => {
      return page.isChecked(subj(selector), options);
    },
    isHidden: async (selector: string, options?: Parameters<Page['isHidden']>[1]) => {
      return page.isHidden(subj(selector), options);
    },
    locator: (selector: string, options?: Parameters<Page['locator']>[1]) => {
      return page.locator(subj(selector), options);
    },
  };
}

export const scoutPageFixture = base.extend<{ page: ScoutPage }>({
  page: async ({ page }, use) => {
    page.testSubj = extendPageWithTestSubject(page);

    await use(page);
  },
});
