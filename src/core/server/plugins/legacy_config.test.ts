/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { ConfigService, Env } from '@kbn/config';
import { configServiceMock, getEnvOptions, rawConfigServiceMock } from '@kbn/config-mocks';
import { getGlobalConfig, getGlobalConfig$ } from './legacy_config';
import { REPO_ROOT } from '@kbn/utils';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { duration } from 'moment';
import { fromRoot } from '@kbn/utils';
import { ByteSizeValue, schema } from '@kbn/config-schema';
import { CoreContext } from '@kbn/core-base-server-internal';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
// TODO: Refactor to use coreSetup and coreStart for mocking the config.
describe('Legacy config', () => {
  let env: Env;
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let coreContext: CoreContext;

  beforeEach(() => {
    env = Env.createDefault(REPO_ROOT, getEnvOptions());
    logger = loggingSystemMock.create();
  });

  const createConfigService = (rawConfig: Record<string, any> = {}): ConfigService => {
    // I need to use coreSetup to properly setup these mocks. See packages/core/lifecycle/core-lifecycle-server-mocks/src/core_setup.mock.ts
    coreContext = mockCoreContext.create({
      env,
      logger,
      configService: configServiceMock.create(),
    });
    const config$ = rawConfigServiceMock.create({
      rawConfig: {
        elasticsearch: { shardTimeout: '30s', requestTimeout: '30s', pingTimeout: '30s' },
        path: { data: fromRoot('data') },
        savedObjects: { maxImportPayloadBytes: 26214400 },
      },
    });

    const configService = new ConfigService(config$, env, logger);
    configService.setSchema(
      'elasticsearch',
      schema.object({
        shardTimeout: schema.duration({ defaultValue: '30s' }),
        requestTimeout: schema.duration({ defaultValue: '30s' }),
        pingTimeout: schema.duration({ defaultValue: schema.siblingRef('requestTimeout') }),
      })
    );
    configService.setSchema('path', schema.object({ data: schema.string() }));
    configService.setSchema(
      'savedObjects',
      schema.object({
        maxImportPayloadBytes: schema.byteSize({ defaultValue: new ByteSizeValue(0) }),
      })
    );
    return configService;
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
