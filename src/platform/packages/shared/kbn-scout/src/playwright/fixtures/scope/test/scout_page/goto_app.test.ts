/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, Page } from '@playwright/test';
import { test as playwrightTest } from '@playwright/test';
import { navigateToApp } from './goto_app';

jest.mock('@playwright/test', () => ({ test: { info: jest.fn() } }));

const infoMock = playwrightTest.info as unknown as jest.Mock;

const setProjectTimeouts = (use: { navigationTimeout?: number; actionTimeout?: number }) =>
  infoMock.mockReturnValue({ project: { use } });

const createPage = () => ({ goto: jest.fn().mockResolvedValue(null) }) as unknown as Page;
const createLocator = () =>
  ({ waitFor: jest.fn().mockResolvedValue(undefined) }) as unknown as Locator;

describe('navigateToApp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('gates on the local navigation budget', async () => {
    setProjectTimeouts({ navigationTimeout: 20_000, actionTimeout: 10_000 });
    const readyWhen = createLocator();

    await navigateToApp(createPage(), () => '/app/console', { readyWhen });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 30_000 });
  });

  it("gates on the Cloud projects' raised navigation budget", async () => {
    setProjectTimeouts({ navigationTimeout: 45_000, actionTimeout: 10_000 });
    const readyWhen = createLocator();

    await navigateToApp(createPage(), () => '/app/console', { readyWhen });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 55_000 });
  });

  it('prefers an explicit readyTimeout', async () => {
    setProjectTimeouts({ navigationTimeout: 45_000, actionTimeout: 10_000 });
    const readyWhen = createLocator();

    await navigateToApp(createPage(), () => '/app/console', { readyWhen, readyTimeout: 90_000 });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 90_000 });
  });

  it('falls back to the Scout defaults when the project leaves them unset', async () => {
    setProjectTimeouts({});
    const readyWhen = createLocator();

    await navigateToApp(createPage(), () => '/app/console', { readyWhen });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 30_000 });
  });

  it('resolves on the browser load event and reads no project budget without readyWhen', async () => {
    setProjectTimeouts({ navigationTimeout: 45_000, actionTimeout: 10_000 });
    const page = createPage();

    await navigateToApp(page, () => '/app/console');

    expect(page.goto).toHaveBeenCalledWith('/app/console', {});
    expect(infoMock).not.toHaveBeenCalled();
  });
});
