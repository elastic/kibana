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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LegacyPluginSpec } from '../plugins/find_legacy_plugin_specs';
// @ts-ignore
import { transformDeprecations } from '../../../../legacy/server/config/transform_deprecations';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LegacyConfig } from './index';
import { getUnusedConfigKeys } from './get_unused_config_keys';

jest.mock('../../../../legacy/server/config/transform_deprecations', () => ({
  transformDeprecations: jest.fn().mockImplementation(s => s),
}));

describe('getUnusedConfigKeys', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    transformDeprecations.mockImplementation((s: any) => s);
  });

  const getConfig = (values: Record<string, any> = {}): LegacyConfig =>
    ({
      get: () => values as any,
    } as LegacyConfig);

  describe('not using core or plugin specs', () => {
    it('should return an empty list for empty parameters', async () => {
      expect(await getUnusedConfigKeys([], [], [], {}, getConfig())).toEqual([]);
    });

    it('returns empty list when config and settings have the same properties', async () => {
      expect(
        await getUnusedConfigKeys(
          [],
          [],
          [],
          {
            presentInBoth: true,
            alsoInBoth: 'someValue',
          },
          getConfig({
            presentInBoth: true,
            alsoInBoth: 'someValue',
          })
        )
      ).toEqual([]);
    });

    it('returns empty list when config has entries not present in settings', async () => {
      expect(
        await getUnusedConfigKeys(
          [],
          [],
          [],
          {
            presentInBoth: true,
          },
          getConfig({
            presentInBoth: true,
            onlyInConfig: 'someValue',
          })
        )
      ).toEqual([]);
    });

    it('returns the list of properties from settings not present in config', async () => {
      expect(
        await getUnusedConfigKeys(
          [],
          [],
          [],
          {
            presentInBoth: true,
            onlyInSetting: 'value',
          },
          getConfig({
            presentInBoth: true,
          })
        )
      ).toEqual(['onlyInSetting']);
    });

    it('correctly handle nested properties', async () => {
      expect(
        await getUnusedConfigKeys(
          [],
          [],
          [],
          {
            elasticsearch: {
              username: 'foo',
              password: 'bar',
            },
          },
          getConfig({
            elasticsearch: {
              username: 'foo',
              onlyInConfig: 'default',
            },
          })
        )
      ).toEqual(['elasticsearch.password']);
    });

    it('correctly handle "env" specific case', async () => {
      expect(
        await getUnusedConfigKeys(
          [],
          [],
          [],
          {
            env: 'development',
          },
          getConfig({
            env: {
              name: 'development',
            },
          })
        )
      ).toEqual([]);
    });

    it('correctly handle array properties', async () => {
      expect(
        await getUnusedConfigKeys(
          [],
          [],
          [],
          {
            prop: ['a', 'b', 'c'],
          },
          getConfig({
            prop: ['a'],
          })
        )
      ).toEqual([]);
    });
  });

  it('ignores config for plugins that are disabled', async () => {
    expect(
      await getUnusedConfigKeys(
        [],
        [],
        [
          ({
            id: 'foo',
            getConfigPrefix: () => 'foo.bar',
          } as unknown) as LegacyPluginSpec,
        ],
        {
          foo: {
            bar: {
              unused: true,
            },
          },
          plugin: {
            missingProp: false,
          },
        },
        getConfig({
          prop: 'a',
        })
      )
    ).toEqual(['plugin.missingProp']);
  });

  it('ignores properties managed by the new platform', async () => {
    expect(
      await getUnusedConfigKeys(
        ['core', 'foo.bar'],
        [],
        [],
        {
          core: {
            prop: 'value',
          },
          foo: {
            bar: true,
            dolly: true,
          },
        },
        getConfig({})
      )
    ).toEqual(['foo.dolly']);
  });

  describe('using deprecation', () => {
    it('calls transformDeprecations with the settings', async () => {
      await getUnusedConfigKeys(
        [],
        [],
        [],
        {
          prop: 'settings',
        },
        getConfig({
          prop: 'config',
        })
      );
      expect(transformDeprecations).toHaveBeenCalledTimes(1);
      expect(transformDeprecations).toHaveBeenCalledWith({
        prop: 'settings',
      });
    });

    it('uses the transformed settings', async () => {
      transformDeprecations.mockImplementation((settings: Record<string, any>) => {
        delete settings.deprecated;
        settings.updated = 'new value';
        return settings;
      });
      expect(
        await getUnusedConfigKeys(
          [],
          [],
          [],
          {
            onlyInSettings: 'bar',
            deprecated: 'value',
          },
          getConfig({
            updated: 'config',
          })
        )
      ).toEqual(['onlyInSettings']);
    });

    it('should use the plugin deprecations provider', async () => {
      expect(
        await getUnusedConfigKeys(
          [],
          [
            ({
              getDeprecationsProvider() {
                return async ({ rename }: any) => [rename('foo1', 'foo2')];
              },
              getConfigPrefix: () => 'foo',
            } as unknown) as LegacyPluginSpec,
          ],
          [],
          {
            foo: {
              foo: 'dolly',
              foo1: 'bar',
            },
          },
          getConfig({
            foo: {
              foo2: 'bar',
            },
          })
        )
      ).toEqual(['foo.foo']);
    });
  });
});
