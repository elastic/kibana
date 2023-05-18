/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type { CliArgs } from '@kbn/config';

import { mockRawConfigService, mockRawConfigServiceConstructor } from './bootstrap.test.mocks';

jest.mock('@kbn/core-logging-server-internal');

import { bootstrap } from './bootstrap';

const bootstrapCfg = {
  configs: ['config/kibana.yml'],
  cliArgs: {} as unknown as CliArgs,
  applyConfigOverrides: () => ({}),
};

describe('bootstrap', () => {
  describe('serverless', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should load additional serverless files for a valid project', async () => {
      mockRawConfigService.getConfig$.mockReturnValue(of({ serverless: 'es' }));
      await bootstrap(bootstrapCfg);
      expect(mockRawConfigServiceConstructor).toHaveBeenCalledTimes(2);
      expect(mockRawConfigServiceConstructor).toHaveBeenNthCalledWith(
        1,
        bootstrapCfg.configs,
        bootstrapCfg.applyConfigOverrides
      );
      expect(mockRawConfigServiceConstructor).toHaveBeenNthCalledWith(
        2,
        [
          expect.stringContaining('config/serverless.yml'),
          expect.stringContaining('config/serverless.es.yml'),
          ...bootstrapCfg.configs,
        ],
        bootstrapCfg.applyConfigOverrides
      );
    });

    test('should skip loading the serverless files for an invalid project', async () => {
      mockRawConfigService.getConfig$.mockReturnValue(of({ serverless: 'not-valid' }));
      await bootstrap(bootstrapCfg);
      expect(mockRawConfigServiceConstructor).toHaveBeenCalledTimes(1);
      expect(mockRawConfigServiceConstructor).toHaveBeenNthCalledWith(
        1,
        bootstrapCfg.configs,
        bootstrapCfg.applyConfigOverrides
      );
    });
  });
});
