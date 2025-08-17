/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map, shareReplay } from 'rxjs';
import type { Observable } from 'rxjs';
import { combineLatest } from 'rxjs';
import type { PathConfigType } from '@kbn/utils';
import { config as pathConfig } from '@kbn/utils';
import { pick, deepFreeze } from '@kbn/std';
import type { IConfigService } from '@kbn/config';

import type { ElasticsearchConfigType } from '@kbn/core-elasticsearch-server-internal';
import { config as elasticsearchConfig } from '@kbn/core-elasticsearch-server-internal';
import {
  type SavedObjectsConfigType,
  savedObjectsConfig,
} from '@kbn/core-saved-objects-base-server-internal';
import type { SharedGlobalConfig } from '@kbn/core-plugins-server';
import { SharedGlobalConfigKeys } from '@kbn/core-plugins-server';

const createGlobalConfig = ({
  elasticsearch,
  path,
  savedObjects,
}: {
  elasticsearch: ElasticsearchConfigType;
  path: PathConfigType;
  savedObjects: SavedObjectsConfigType;
}): SharedGlobalConfig => {
  return deepFreeze({
    elasticsearch: pick(elasticsearch, SharedGlobalConfigKeys.elasticsearch),
    path: pick(path, SharedGlobalConfigKeys.path),
    savedObjects: pick(savedObjects, SharedGlobalConfigKeys.savedObjects),
  });
};

export const getGlobalConfig = (configService: IConfigService): SharedGlobalConfig => {
  return createGlobalConfig({
    elasticsearch: configService.atPathSync<ElasticsearchConfigType>(elasticsearchConfig.path),
    path: configService.atPathSync<PathConfigType>(pathConfig.path),
    savedObjects: configService.atPathSync<SavedObjectsConfigType>(savedObjectsConfig.path),
  });
};

export const getGlobalConfig$ = (configService: IConfigService): Observable<SharedGlobalConfig> => {
  return combineLatest([
    configService.atPath<ElasticsearchConfigType>(elasticsearchConfig.path),
    configService.atPath<PathConfigType>(pathConfig.path),
    configService.atPath<SavedObjectsConfigType>(savedObjectsConfig.path),
  ]).pipe(
    map(
      ([elasticsearch, path, savedObjects]) =>
        createGlobalConfig({
          elasticsearch,
          path,
          savedObjects,
        }),
      shareReplay(1)
    )
  );
};
