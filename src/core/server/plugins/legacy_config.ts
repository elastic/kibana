/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { map, shareReplay } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { PathConfigType, config as pathConfig } from '@kbn/utils';
import { pick, deepFreeze } from '@kbn/std';
import { IConfigService } from '@kbn/config';

import { SharedGlobalConfig, SharedGlobalConfigKeys } from './types';
import { KibanaConfigType, config as kibanaConfig } from '../kibana_config';
import {
  ElasticsearchConfigType,
  config as elasticsearchConfig,
} from '../elasticsearch/elasticsearch_config';
import { SavedObjectsConfigType, savedObjectsConfig } from '../saved_objects/saved_objects_config';

const createGlobalConfig = ({
  kibana,
  elasticsearch,
  path,
  savedObjects,
}: {
  kibana: KibanaConfigType;
  elasticsearch: ElasticsearchConfigType;
  path: PathConfigType;
  savedObjects: SavedObjectsConfigType;
}): SharedGlobalConfig => {
  return deepFreeze({
    kibana: pick(kibana, SharedGlobalConfigKeys.kibana),
    elasticsearch: pick(elasticsearch, SharedGlobalConfigKeys.elasticsearch),
    path: pick(path, SharedGlobalConfigKeys.path),
    savedObjects: pick(savedObjects, SharedGlobalConfigKeys.savedObjects),
  });
};

export const getGlobalConfig = (configService: IConfigService): SharedGlobalConfig => {
  return createGlobalConfig({
    kibana: configService.atPathSync<KibanaConfigType>(kibanaConfig.path),
    elasticsearch: configService.atPathSync<ElasticsearchConfigType>(elasticsearchConfig.path),
    path: configService.atPathSync<PathConfigType>(pathConfig.path),
    savedObjects: configService.atPathSync<SavedObjectsConfigType>(savedObjectsConfig.path),
  });
};

export const getGlobalConfig$ = (configService: IConfigService): Observable<SharedGlobalConfig> => {
  return combineLatest([
    configService.atPath<KibanaConfigType>(kibanaConfig.path),
    configService.atPath<ElasticsearchConfigType>(elasticsearchConfig.path),
    configService.atPath<PathConfigType>(pathConfig.path),
    configService.atPath<SavedObjectsConfigType>(savedObjectsConfig.path),
  ]).pipe(
    map(
      ([kibana, elasticsearch, path, savedObjects]) =>
        createGlobalConfig({
          kibana,
          elasticsearch,
          path,
          savedObjects,
        }),
      shareReplay(1)
    )
  );
};
