/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IConfigService } from '@kbn/config';
import { configServiceMock } from '@kbn/config-mocks';
import { ByteSizeValue } from '@kbn/config-schema';
import { fromRoot } from '@kbn/repo-info';
import { duration } from 'moment';
import { from } from 'rxjs';

export const createCoreContextConfigServiceMock = (): IConfigService => {
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
