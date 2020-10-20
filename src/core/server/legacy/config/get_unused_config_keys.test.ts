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

import { LegacyConfig, LegacyVars } from '../types';
import { getUnusedConfigKeys } from './get_unused_config_keys';

describe('getUnusedConfigKeys', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const getConfig = (values: LegacyVars = {}): LegacyConfig =>
    ({
      get: () => values as any,
    } as LegacyConfig);

  describe('not using core or plugin specs', () => {
    it('should return an empty list for empty parameters', async () => {
      expect(
        await getUnusedConfigKeys({
          coreHandledConfigPaths: [],
          settings: {},
          legacyConfig: getConfig(),
        })
      ).toEqual([]);
    });

    it('returns empty list when config and settings have the same properties', async () => {
      expect(
        await getUnusedConfigKeys({
          coreHandledConfigPaths: [],
          settings: {
            presentInBoth: true,
            alsoInBoth: 'someValue',
          },
          legacyConfig: getConfig({
            presentInBoth: true,
            alsoInBoth: 'someValue',
          }),
        })
      ).toEqual([]);
    });

    it('returns empty list when config has entries not present in settings', async () => {
      expect(
        await getUnusedConfigKeys({
          coreHandledConfigPaths: [],
          settings: {
            presentInBoth: true,
          },
          legacyConfig: getConfig({
            presentInBoth: true,
            onlyInConfig: 'someValue',
          }),
        })
      ).toEqual([]);
    });

    it('returns the list of properties from settings not present in config', async () => {
      expect(
        await getUnusedConfigKeys({
          coreHandledConfigPaths: [],
          settings: {
            presentInBoth: true,
            onlyInSetting: 'value',
          },
          legacyConfig: getConfig({
            presentInBoth: true,
          }),
        })
      ).toEqual(['onlyInSetting']);
    });

    it('correctly handle nested properties', async () => {
      expect(
        await getUnusedConfigKeys({
          coreHandledConfigPaths: [],
          settings: {
            elasticsearch: {
              username: 'foo',
              password: 'bar',
            },
          },
          legacyConfig: getConfig({
            elasticsearch: {
              username: 'foo',
              onlyInConfig: 'default',
            },
          }),
        })
      ).toEqual(['elasticsearch.password']);
    });

    it('correctly handle "env" specific case', async () => {
      expect(
        await getUnusedConfigKeys({
          coreHandledConfigPaths: [],
          settings: {
            env: 'development',
          },
          legacyConfig: getConfig({
            env: {
              name: 'development',
            },
          }),
        })
      ).toEqual([]);
    });

    it('correctly handle array properties', async () => {
      expect(
        await getUnusedConfigKeys({
          coreHandledConfigPaths: [],
          settings: {
            prop: ['a', 'b', 'c'],
          },
          legacyConfig: getConfig({
            prop: ['a'],
          }),
        })
      ).toEqual([]);
    });
  });

  it('ignores properties managed by the new platform', async () => {
    expect(
      await getUnusedConfigKeys({
        coreHandledConfigPaths: ['core', 'foo.bar'],
        settings: {
          core: {
            prop: 'value',
          },
          foo: {
            bar: true,
            dolly: true,
          },
        },
        legacyConfig: getConfig({}),
      })
    ).toEqual(['foo.dolly']);
  });

  it('handles array values', async () => {
    expect(
      await getUnusedConfigKeys({
        coreHandledConfigPaths: ['core', 'array'],
        settings: {
          core: {
            prop: 'value',
            array: [1, 2, 3],
          },
          array: ['some', 'values'],
        },
        legacyConfig: getConfig({}),
      })
    ).toEqual([]);
  });
});
