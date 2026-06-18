/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import { WORKFLOWS_VERSIONING_SETTING_ID } from '@kbn/workflows/common/constants';

import {
  isWorkflowVersioningEnabled,
  resetWorkflowVersioningEnabledCache,
} from './is_workflow_versioning_enabled';

describe('isWorkflowVersioningEnabled', () => {
  const createCoreStart = (enabled: boolean) => {
    const get = jest.fn().mockResolvedValue(enabled);
    return {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({}),
      },
      uiSettings: {
        globalAsScopedToClient: jest.fn().mockReturnValue({ get }),
      },
    } as unknown as CoreStart & {
      uiSettings: { globalAsScopedToClient: jest.Mock };
    };
  };

  beforeEach(() => {
    resetWorkflowVersioningEnabledCache();
  });

  it('reads the global uiSetting once and caches the result', async () => {
    const coreStart = createCoreStart(true);

    await expect(isWorkflowVersioningEnabled(coreStart)).resolves.toBe(true);
    await expect(isWorkflowVersioningEnabled(coreStart)).resolves.toBe(true);

    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
    expect(coreStart.uiSettings.globalAsScopedToClient).toHaveBeenCalledTimes(1);
    expect(
      coreStart.uiSettings.globalAsScopedToClient.mock.results[0].value.get
    ).toHaveBeenCalledWith(WORKFLOWS_VERSIONING_SETTING_ID);
  });

  it('deduplicates concurrent reads', async () => {
    let resolveGet: (value: boolean) => void = () => undefined;
    const get = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveGet = resolve;
        })
    );
    const coreStart = {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({}),
      },
      uiSettings: {
        globalAsScopedToClient: jest.fn().mockReturnValue({ get }),
      },
    } as unknown as CoreStart;

    const first = isWorkflowVersioningEnabled(coreStart);
    const second = isWorkflowVersioningEnabled(coreStart);

    resolveGet(true);

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('re-reads after the cache is reset', async () => {
    const coreStart = createCoreStart(false);

    await isWorkflowVersioningEnabled(coreStart);
    resetWorkflowVersioningEnabledCache();
    await isWorkflowVersioningEnabled(coreStart);

    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledTimes(2);
  });
});
