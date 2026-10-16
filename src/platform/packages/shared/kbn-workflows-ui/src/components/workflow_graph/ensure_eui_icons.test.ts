/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ICON_MODULE = '@elastic/eui/optimize/es/components/icon/icon';

describe('ensure_eui_icons', () => {
  const { JEST_WORKER_ID, NODE_ENV } = process.env;

  afterEach(() => {
    process.env.JEST_WORKER_ID = JEST_WORKER_ID;
    process.env.NODE_ENV = NODE_ENV;
    jest.resetModules();
    jest.dontMock(ICON_MODULE);
  });

  it('does not seed icons as a side effect of being imported', async () => {
    // The module no-ops under jest; lift that guard so an import-time call would
    // reach the (mocked) icon cache module.
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'production';
    const iconModuleLoaded = jest.fn();
    jest.doMock(
      ICON_MODULE,
      () => {
        iconModuleLoaded();
        return { appendIconComponentCache: jest.fn() };
      },
      { virtual: true }
    );

    await jest.isolateModulesAsync(async () => {
      const { ensureWorkflowGraphEuiIcons } = await import('./ensure_eui_icons');
      expect(typeof ensureWorkflowGraphEuiIcons).toBe('function');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(iconModuleLoaded).not.toHaveBeenCalled();
  });
});
