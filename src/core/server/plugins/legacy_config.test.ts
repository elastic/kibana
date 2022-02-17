/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { ConfigService, Env } from '@kbn/config';
import { getEnvOptions, rawConfigServiceMock } from '../config/mocks';
import { getGlobalConfig, getGlobalConfig$ } from './legacy_config';
import { REPO_ROOT } from '@kbn/utils';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { duration } from 'moment';
import { fromRoot } from '@kbn/utils';
import { ByteSizeValue } from '@kbn/config-schema';
import { Server } from '../server';

describe('Legacy config', () => {
  let env: Env;
  let logger: ReturnType<typeof loggingSystemMock.create>;

  beforeEach(() => {
    env = Env.createDefault(REPO_ROOT, getEnvOptions());
    logger = loggingSystemMock.create();
  });

  const createConfigService = (rawConfig: Record<string, any> = {}): ConfigService => {
    const rawConfigService = rawConfigServiceMock.create({ rawConfig });
    const server = new Server(rawConfigService, env, logger);
    server.setupCoreConfig();
    return server.configService;
  };

  describe('getGlobalConfig', () => {
    it('should return the global config', async () => {
      const configService = createConfigService();
      await configService.validate();

      const legacyConfig = getGlobalConfig(configService);

      expect(legacyConfig).toStrictEqual({
        elasticsearch: {
          shardTimeout: duration(30, 's'),
          requestTimeout: duration(30, 's'),
          pingTimeout: duration(30, 's'),
        },
        path: { data: fromRoot('data') },
        savedObjects: { maxImportPayloadBytes: new ByteSizeValue(26214400) },
      });
    });
  });

  describe('getGlobalConfig$', () => {
    it('should return an observable for the global config', async () => {
      const configService = createConfigService();

      const legacyConfig = await getGlobalConfig$(configService).pipe(take(1)).toPromise();

      expect(legacyConfig).toStrictEqual({
        elasticsearch: {
          shardTimeout: duration(30, 's'),
          requestTimeout: duration(30, 's'),
          pingTimeout: duration(30, 's'),
        },
        path: { data: fromRoot('data') },
        savedObjects: { maxImportPayloadBytes: new ByteSizeValue(26214400) },
      });
    });
  });
});
