/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page } from 'playwright/test';
import { PageObjects } from '../../page_objects';

export interface ScoutTestFixtures {
  browserAuth: LoginFixture;
  page: ScoutPage;
  pageObjects: PageObjects;
}

export interface LoginFixture {
  loginAsViewer: () => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  loginAsPrivilegedUser: () => Promise<void>;
}

export type ScoutPage = Page & {
  gotoApp: (appName: string, options?: Parameters<Page['goto']>[1]) => ReturnType<Page['goto']>;
  testSubj: {
    check: (selector: string, options?: Parameters<Page['check']>[1]) => ReturnType<Page['check']>;
    click: (selector: string, options?: Parameters<Page['click']>[1]) => ReturnType<Page['click']>;
    dblclick: (
      selector: string,
      options?: Parameters<Page['dblclick']>[1]
    ) => ReturnType<Page['dblclick']>;
    fill: (
      selector: string,
      value: string,
      options?: Parameters<Page['fill']>[2]
    ) => ReturnType<Page['fill']>;
    focus: (selector: string, options?: Parameters<Page['focus']>[1]) => ReturnType<Page['focus']>;
    getAttribute: (
      selector: string,
      name: string,
      options?: Parameters<Page['getAttribute']>[2]
    ) => ReturnType<Page['getAttribute']>;
    hover: (selector: string, options?: Parameters<Page['hover']>[1]) => ReturnType<Page['hover']>;
    innerText: (
      selector: string,
      options?: Parameters<Page['innerText']>[1]
    ) => ReturnType<Page['innerText']>;
    isEnabled: (
      selector: string,
      options?: Parameters<Page['isEnabled']>[1]
    ) => ReturnType<Page['isEnabled']>;
    isChecked: (
      selector: string,
      options?: Parameters<Page['isChecked']>[1]
    ) => ReturnType<Page['isChecked']>;
    isHidden: (
      selector: string,
      options?: Parameters<Page['isHidden']>[1]
    ) => ReturnType<Page['isHidden']>;
    locator: (
      selector: string,
      options?: Parameters<Page['locator']>[1]
    ) => ReturnType<Page['locator']>;
  };
};
