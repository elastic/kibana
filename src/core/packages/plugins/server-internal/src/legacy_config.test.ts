/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { take } from 'rxjs';
import { getGlobalConfig, getGlobalConfig$ } from './legacy_config';
import { duration } from 'moment';
import { fromRoot } from '@kbn/repo-info';
import { ByteSizeValue } from '@kbn/config-schema';
import { createCoreContextConfigServiceMock } from './test_helpers';

describe('Legacy config', () => {
  describe('getGlobalConfig', () => {
    it('should return the global config', async () => {
      const configService = createCoreContextConfigServiceMock();
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
      const configService = createCoreContextConfigServiceMock();

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
