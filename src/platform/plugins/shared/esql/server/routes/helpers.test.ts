/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { resolveIncludeDatasets } from './helpers';

describe('resolveIncludeDatasets', () => {
  it('returns the setting value when the uiSettings client resolves it', async () => {
    const uiSettingsClient = {
      get: jest.fn().mockResolvedValue(true),
    } as unknown as IUiSettingsClient;

    await expect(resolveIncludeDatasets(uiSettingsClient)).resolves.toBe(true);
  });

  it('returns false when the setting is not registered (esql plugin has no dependency on agent_builder)', async () => {
    const uiSettingsClient = {
      get: jest
        .fn()
        .mockRejectedValue(new Error('Unknown setting agentBuilder:experimentalFeatures')),
    } as unknown as IUiSettingsClient;

    await expect(resolveIncludeDatasets(uiSettingsClient)).resolves.toBe(false);
  });
});
