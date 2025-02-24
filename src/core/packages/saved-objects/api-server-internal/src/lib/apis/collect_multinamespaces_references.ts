/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
} from '@kbn/core-saved-objects-api-server';
import { ApiExecutionContext } from './types';
import { collectMultiNamespaceReferences } from './internals/collect_multi_namespace_references';

export interface PerformCreateParams<T = unknown> {
  objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
  options: SavedObjectsCollectMultiNamespaceReferencesOptions;
}

export const performCollectMultiNamespaceReferences = async <T>(
  { objects, options }: PerformCreateParams<T>,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> => {
  const { common: commonHelper } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  return collectMultiNamespaceReferences({
    registry,
    allowedTypes,
    client,
    serializer,
    getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
    createPointInTimeFinder: commonHelper.createPointInTimeFinder.bind(commonHelper),
    securityExtension,
    objects,
    options: { ...options, namespace },
  });
};
