/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ensureValidConfiguration } from './ensure_valid_configuration';
import { getUnusedConfigKeys } from './get_unused_config_keys';
import { configServiceMock } from '../../config/config_service.mock';

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
        pluginSpecs: 'pluginSpecs',
        disabledPluginSpecs: 'disabledPluginSpecs',
        pluginExtendedConfig: 'pluginExtendedConfig',
        uiExports: 'uiExports',
      } as any
    );
    expect(getUnusedConfigKeys).toHaveBeenCalledTimes(1);
    expect(getUnusedConfigKeys).toHaveBeenCalledWith({
      coreHandledConfigPaths: ['core', 'elastic'],
      pluginSpecs: 'pluginSpecs',
      disabledPluginSpecs: 'disabledPluginSpecs',
      inputSettings: 'settings',
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
