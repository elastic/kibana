/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { from } from 'rxjs';
import { take } from 'rxjs/operators';
import { IConfigService } from '@kbn/config';
import { configServiceMock } from '@kbn/config-mocks';
import { getGlobalConfig, getGlobalConfig$ } from './legacy_config';
import { duration } from 'moment';
import { fromRoot } from '@kbn/utils';
import { ByteSizeValue } from '@kbn/config-schema';

describe('Legacy config', () => {
  const createConfigService = (): IConfigService => {
    const configService = configServiceMock.create();
    const getPathConfig = (path: string | string[]) => {
      switch (path) {
        case 'elasticsearch':
          return {
            shardTimeout: duration(30, 's'),
            requestTimeout: duration(30, 's'),
            pingTimeout: duration(30, 's'),
            someOtherProps: 'unused',
          };
        case 'path':
          return { data: fromRoot('data'), someOtherProps: 'unused' };
        case 'savedObjects':
          return { maxImportPayloadBytes: new ByteSizeValue(26214400), someOtherProps: 'unused' };
        default:
          return {};
      }
    };
    configService.atPath.mockImplementation((path) => {
      return from([getPathConfig(path)]);
    });
    configService.atPathSync.mockImplementation((path) => {
      return getPathConfig(path);
    });

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
