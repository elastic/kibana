/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import LRUCache from 'lru-cache';
import type { ObjectMigrationDefinition } from '@kbn/object-versioning';
import type { ContentManagementServiceDefinitionVersioned, Version } from '@kbn/object-versioning';
import {
  compileServiceDefinitions,
  getContentManagmentServicesTransforms,
} from '@kbn/object-versioning';
import type { StorageContextGetTransformFn } from '../core';

let isCacheEnabled = true;

// This is used in tests to disable the cache
export const disableCache = () => {
  isCacheEnabled = false;
};

/**
 * We keep a cache of compiled service definition to avoid unnecessary recompile on every request.
 */
const compiledCache = new LRUCache<string, { [path: string]: ObjectMigrationDefinition }>({
  max: 50,
});

/**
 * Wrap the "getContentManagmentServicesTransforms()" handler from the @kbn/object-versioning package
 * to be able to cache the service definitions compilations so we can reuse them accross request as the
 * services definitions won't change until a new Elastic version is released. In which case the cache
 * will be cleared.
 *
 * @param contentTypeId The content type id for the service definition
 * @returns A "getContentManagmentServicesTransforms()"
 */
export const getServiceObjectTransformFactory =
  (contentTypeId: string, _requestVersion: Version): StorageContextGetTransformFn =>
  (definitions: ContentManagementServiceDefinitionVersioned, requestVersionOverride?: Version) => {
    const requestVersion = requestVersionOverride ?? _requestVersion;

    if (isCacheEnabled) {
      const compiledFromCache = compiledCache.get(contentTypeId);

      if (compiledFromCache) {
        return getContentManagmentServicesTransforms(
          definitions,
          requestVersion,
          compiledFromCache
        );
      }
    }

    const compiled = compileServiceDefinitions(definitions);

    if (isCacheEnabled) {
      compiledCache.set(contentTypeId, compiled);
    }

    return getContentManagmentServicesTransforms(definitions, requestVersion, compiled);
  };
