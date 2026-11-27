/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
const ICON_SET_MODULE = './eui_icon_set';

describe('ensure_eui_icons', () => {
  const { JEST_WORKER_ID, NODE_ENV } = process.env;

  afterEach(() => {
    process.env.JEST_WORKER_ID = JEST_WORKER_ID;
    process.env.NODE_ENV = NODE_ENV;
    jest.resetModules();
    jest.dontMock(ICON_SET_MODULE);
  });

  it('does not seed icons as a side effect of being imported', async () => {
    // The module no-ops under jest; lift that guard so an import-time call would
    // reach the (mocked) icon set module.
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'production';
    const iconSetLoaded = jest.fn();
    jest.doMock(
      ICON_SET_MODULE,
      () => {
        iconSetLoaded();
        return { seedEuiIcons: jest.fn() };
      },
      { virtual: true }
    );

    await jest.isolateModulesAsync(async () => {
      const { ensureWorkflowGraphEuiIcons } = await import('./ensure_eui_icons');
      expect(typeof ensureWorkflowGraphEuiIcons).toBe('function');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(iconSetLoaded).not.toHaveBeenCalled();
  });

  it('retries after a failed icon load instead of staying unseeded', async () => {
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'production';
    const iconSetFactory = jest.fn(() => {
      throw new Error('chunk failed');
    });
    jest.doMock(ICON_SET_MODULE, iconSetFactory, { virtual: true });

    await jest.isolateModulesAsync(async () => {
      const { ensureWorkflowGraphEuiIcons } = await import('./ensure_eui_icons');
      ensureWorkflowGraphEuiIcons();
      await new Promise((resolve) => setTimeout(resolve, 0));
      ensureWorkflowGraphEuiIcons();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(iconSetFactory).toHaveBeenCalledTimes(2);
  });
  it('seeds every icon through one module load, and only once', async () => {
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'production';
    const seedEuiIcons = jest.fn();
    const iconSetFactory = jest.fn(() => ({ seedEuiIcons }));
    jest.doMock(ICON_SET_MODULE, iconSetFactory, { virtual: true });

    await jest.isolateModulesAsync(async () => {
      const { ensureWorkflowGraphEuiIcons } = await import('./ensure_eui_icons');
      ensureWorkflowGraphEuiIcons();
      ensureWorkflowGraphEuiIcons();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(iconSetFactory).toHaveBeenCalledTimes(1);
    expect(seedEuiIcons).toHaveBeenCalledTimes(1);
  });
});
