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

const createPage = () => {
  const loadingScreen = createLocator();
  const page = {
    goto: jest.fn().mockResolvedValue(null),
    locator: jest.fn().mockReturnValue(loadingScreen),
  } as unknown as Page;
  return { page, loadingScreen };
};
const createLocator = () =>
  ({ waitFor: jest.fn().mockResolvedValue(undefined) } as unknown as Locator);

describe('navigateToApp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('gates on the local navigation budget', async () => {
    setProjectTimeouts({ navigationTimeout: 20_000, actionTimeout: 10_000 });
    const readyWhen = createLocator();

    await navigateToApp(createPage().page, () => '/app/console', { readyWhen });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 30_000 });
  });

  it("gates on the Cloud projects' raised navigation budget", async () => {
    setProjectTimeouts({ navigationTimeout: 45_000, actionTimeout: 10_000 });
    const readyWhen = createLocator();

    await navigateToApp(createPage().page, () => '/app/console', { readyWhen });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 55_000 });
  });

  it('prefers an explicit readyTimeout', async () => {
    setProjectTimeouts({ navigationTimeout: 45_000, actionTimeout: 10_000 });
    const readyWhen = createLocator();

    await navigateToApp(createPage().page, () => '/app/console', {
      readyWhen,
      readyTimeout: 90_000,
    });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 90_000 });
  });

  it('falls back to the Scout defaults when the project leaves them unset', async () => {
    setProjectTimeouts({});
    const readyWhen = createLocator();

    await navigateToApp(createPage().page, () => '/app/console', { readyWhen });

    expect(readyWhen.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 30_000 });
  });

  it('does not wait for the Kibana loading screen when readyWhen is set', async () => {
    setProjectTimeouts({ navigationTimeout: 20_000, actionTimeout: 10_000 });
    const { page, loadingScreen } = createPage();

    await navigateToApp(page, () => '/app/console', { readyWhen: createLocator() });

    expect(page.goto).toHaveBeenCalledWith('/app/console', { waitUntil: 'commit' });
    expect(loadingScreen.waitFor).not.toHaveBeenCalled();
  });

  it('waits for the Kibana loading screen to go away without readyWhen', async () => {
    setProjectTimeouts({ navigationTimeout: 45_000, actionTimeout: 10_000 });
    const { page, loadingScreen } = createPage();

    await navigateToApp(page, () => '/app/console');

    expect(page.goto).toHaveBeenCalledWith('/app/console', {});
    expect(page.locator).toHaveBeenCalledWith('[data-test-subj="kbnLoadingMessage"]');
    expect(loadingScreen.waitFor).toHaveBeenCalledWith({ state: 'hidden', timeout: 55_000 });
  });

  it('prefers an explicit readyTimeout for the Kibana loading screen', async () => {
    setProjectTimeouts({ navigationTimeout: 20_000, actionTimeout: 10_000 });
    const { page, loadingScreen } = createPage();

    await navigateToApp(page, () => '/app/console', { readyTimeout: 5_000 });

    expect(loadingScreen.waitFor).toHaveBeenCalledWith({ state: 'hidden', timeout: 5_000 });
  });

  it('leaves navigation alone when the caller picks its own waitUntil', async () => {
    setProjectTimeouts({ navigationTimeout: 20_000, actionTimeout: 10_000 });
    const { page, loadingScreen } = createPage();

    await navigateToApp(page, () => '/app/console', { waitUntil: 'domcontentloaded' });

    expect(page.goto).toHaveBeenCalledWith('/app/console', { waitUntil: 'domcontentloaded' });
    expect(loadingScreen.waitFor).not.toHaveBeenCalled();
    expect(infoMock).not.toHaveBeenCalled();
  });
});
