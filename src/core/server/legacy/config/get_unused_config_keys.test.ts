/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
