/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ensureValidConfiguration } from './ensure_valid_configuration';
import { getUnusedConfigKeys } from './get_unused_config_keys';
import { configServiceMock } from '../../config/mocks';

jest.mock('./get_unused_config_keys');

describe('ensureValidConfiguration', () => {
  let configService: ReturnType<typeof configServiceMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = configServiceMock.create();
    configService.getUsedPaths.mockReturnValue(Promise.resolve(['core', 'elastic']));

    (getUnusedConfigKeys as any).mockImplementation(() => []);
  });

  it('calls getUnusedConfigKeys with correct parameters', async () => {
    await ensureValidConfiguration(
      configService as any,
      {
        settings: 'settings',
        legacyConfig: 'pluginExtendedConfig',
      } as any
    );
    expect(getUnusedConfigKeys).toHaveBeenCalledTimes(1);
    expect(getUnusedConfigKeys).toHaveBeenCalledWith({
      coreHandledConfigPaths: ['core', 'elastic'],
      settings: 'settings',
      legacyConfig: 'pluginExtendedConfig',
    });
  });

  it('returns normally when there is no unused keys', async () => {
    await expect(
      ensureValidConfiguration(configService as any, {} as any)
    ).resolves.toBeUndefined();

    expect(getUnusedConfigKeys).toHaveBeenCalledTimes(1);
  });

  it('throws when there are some unused keys', async () => {
    (getUnusedConfigKeys as any).mockImplementation(() => ['some.key', 'some.other.key']);

    await expect(
      ensureValidConfiguration(configService as any, {} as any)
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unknown configuration key(s): "some.key", "some.other.key". Check for spelling errors and ensure that expected plugins are installed.]`
    );
  });
});
