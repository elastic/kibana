/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { configServiceMock } from '@kbn/config-mocks';
import type { IConfigService } from '@kbn/config';
import { PluginFeatureFlagsTransformer } from './plugin_feature_flags_transformer';

describe('PluginFeatureFlagsTransformer', () => {
  let transformer: PluginFeatureFlagsTransformer;
  let mockConfigService: jest.Mocked<IConfigService>;
  let pluginsConfig$: BehaviorSubject<any>;

  beforeEach(() => {
    pluginsConfig$ = new BehaviorSubject({});
    mockConfigService = configServiceMock.create();
    mockConfigService.atPath.mockReturnValue(pluginsConfig$);
    transformer = new PluginFeatureFlagsTransformer(mockConfigService);
  });

  afterEach(() => {
    pluginsConfig$.complete();
  });

  describe('initialization', () => {
    it('should initialize and subscribe to plugins config', () => {
      expect(mockConfigService.atPath).toHaveBeenCalledWith('plugins');
    });
  });

  describe('transform behavior', () => {
    it('should return config unchanged when master flag is null', () => {
      pluginsConfig$.next({});

      const config = { featureFlags: { testFlag: false } };
      const result = transformer.transform('some-plugin', config);
      expect(result).toEqual(config);
    });

    it('should skip configs without featureFlags object', () => {
      pluginsConfig$.next({ featureFlags: { enableAllFlags: true } });

      const config = { otherProperty: 'value' };
      const result = transformer.transform('some-plugin', config);
      expect(result).toEqual(config);
    });
  });

  describe('master flag application', () => {
    it('should apply master flag (true) to all boolean feature flags', () => {
      pluginsConfig$.next({ featureFlags: { enableAllFlags: true } });

      const config = {
        featureFlags: {
          booleanFlag1: false,
          booleanFlag2: true,
          stringFlag: 'test',
          numberFlag: 42,
        },
      };

      const result = transformer.transform('some-plugin', config);

      expect(result).toEqual({
        featureFlags: {
          booleanFlag1: true,
          booleanFlag2: true,
          stringFlag: 'test',
          numberFlag: 42,
        },
      });
    });

    it('should apply master flag (false) to all boolean feature flags', () => {
      pluginsConfig$.next({ featureFlags: { enableAllFlags: false } });

      const config = {
        featureFlags: {
          booleanFlag1: true,
          booleanFlag2: false,
          stringFlag: 'test',
          numberFlag: 42,
        },
      };

      const result = transformer.transform('some-plugin', config);

      expect(result).toEqual({
        featureFlags: {
          booleanFlag1: false,
          booleanFlag2: false,
          stringFlag: 'test',
          numberFlag: 42,
        },
      });
    });

    it('should ignore non-boolean feature flags', () => {
      pluginsConfig$.next({ featureFlags: { enableAllFlags: true } });

      const config = {
        featureFlags: {
          stringFlag: 'test',
          numberFlag: 42,
        },
      };

      const result = transformer.transform('some-plugin', config);
      expect(result).toEqual(config);
    });
  });

  describe('deep cloning', () => {
    it('should prevent mutation of original config', () => {
      pluginsConfig$.next({ featureFlags: { enableAllFlags: true } });

      const originalConfig = {
        featureFlags: {
          testFlag: false,
          nested: { value: 'unchanged' },
        },
      };

      const result = transformer.transform('some-plugin', originalConfig);

      // Original should be unchanged
      expect(originalConfig.featureFlags.testFlag).toBe(false);
      expect(originalConfig.featureFlags.nested.value).toBe('unchanged');

      // Result should be modified
      expect((result as any).featureFlags.testFlag).toBe(true);
      expect((result as any).featureFlags.nested.value).toBe('unchanged');
    });
  });
});
