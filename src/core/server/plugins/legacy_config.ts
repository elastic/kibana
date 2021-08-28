/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IConfigService } from '@kbn/config';
import { deepFreeze, pick } from '@kbn/std';
import type { PathConfigType } from '@kbn/utils';
import { config as pathConfig } from '@kbn/utils';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import type { ElasticsearchConfigType } from '../elasticsearch/elasticsearch_config';
import { config as elasticsearchConfig } from '../elasticsearch/elasticsearch_config';
import type { KibanaConfigType } from '../kibana_config';
import { config as kibanaConfig } from '../kibana_config';
import type { SavedObjectsConfigType } from '../saved_objects/saved_objects_config';
import { savedObjectsConfig } from '../saved_objects/saved_objects_config';
import type { SharedGlobalConfig } from './types';
import { SharedGlobalConfigKeys } from './types';

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
