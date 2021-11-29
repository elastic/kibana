/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, shareReplay } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { PathConfigType, config as pathConfig } from '@kbn/utils';
import { pick, deepFreeze } from '@kbn/std';
import { IConfigService } from '@kbn/config';
import { X509Certificate } from 'crypto';

import { SharedGlobalConfig, SharedGlobalConfigKeys } from './types';
import {
  ElasticsearchConfigType,
  config as elasticsearchConfig,
  ElasticsearchConfig,
} from '../elasticsearch/elasticsearch_config';
import { SavedObjectsConfigType, savedObjectsConfig } from '../saved_objects/saved_objects_config';

const createGlobalConfig = ({
  elasticsearch,
  path,
  savedObjects,
}: {
  elasticsearch: ElasticsearchConfigType;
  path: PathConfigType;
  savedObjects: SavedObjectsConfigType;
}): SharedGlobalConfig => {
  const resolvedEsConfig = new ElasticsearchConfig(elasticsearch);
  const caFingerprints = parseCaFingerprints(resolvedEsConfig.ssl.certificateAuthorities ?? []);

  return deepFreeze({
    elasticsearch: {
      ...pick(elasticsearch, SharedGlobalConfigKeys.elasticsearch),
      ssl: {
        certificateAuthorityFingerprints: caFingerprints,
      },
    },
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

// TODO: move this to Elasticsearch service itself
const BEGIN_CERT_PRAGMA = `-----BEGIN CERTIFICATE-----\n`;
const END_CERT_PRAGMA = `\n-----END CERTIFICATE-----`;

export const parseCaFingerprints = (certificateAuthorities: string[]): string[] => {
  return certificateAuthorities
    .flatMap((caBundle) => {
      const beginChunks = caBundle.split(BEGIN_CERT_PRAGMA);
      // Skip if no valid BEGIN_CERT_PRAGMA is found
      if (beginChunks.length === 1) return [];

      return beginChunks.map((chunk) => {
        const endIndex = chunk.indexOf(END_CERT_PRAGMA);
        if (endIndex > 0) {
          return `${BEGIN_CERT_PRAGMA}${chunk.substring(0, endIndex)}${END_CERT_PRAGMA}`;
        }
      });
    })
    .filter((ca): ca is string => !!ca)
    .map((ca) => {
      try {
        return new X509Certificate(Buffer.from(ca)).fingerprint256;
      } catch {
        // Ignore any certs that can't be successfully parsed
        return undefined;
      }
    })
    .filter((fingerprint): fingerprint is string => !!fingerprint);
};
