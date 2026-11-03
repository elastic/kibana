/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  IndexMappingMeta,
  VirtualVersionMap,
} from '@kbn/core-saved-objects-base-server-internal';
import { buildTypesMappings, getBaseMappings } from '../core';

/** Builds the mappings used to create a new index, with `_meta` stating that mappings and documents are up to date. */
export const buildIndexMappings = ({
  types,
  typeVirtualVersions,
}: {
  types: SavedObjectsType[];
  typeVirtualVersions: VirtualVersionMap;
}): IndexMapping => {
  const { properties, ...rest } = getBaseMappings();
  return {
    ...rest,
    properties: { ...properties, ...buildTypesMappings(types) },
    _meta: { mappingVersions: typeVirtualVersions, docVersions: typeVirtualVersions },
  };
};

/**
 * `putMapping` replaces `_meta` as a whole, so versions are merged into the current `_meta`.
 * Fields that v3 doesn't own (e.g. zdt's `migrationState`) are preserved, which keeps rollbacks working.
 */
export const mergeMappingVersions =
  (versions: VirtualVersionMap) =>
  (meta: IndexMappingMeta): IndexMappingMeta => ({
    ...meta,
    mappingVersions: { ...meta.mappingVersions, ...versions },
  });

/** See {@link mergeMappingVersions}. */
export const mergeDocVersions =
  (versions: VirtualVersionMap) =>
  (meta: IndexMappingMeta): IndexMappingMeta => ({
    ...meta,
    docVersions: { ...meta.docVersions, ...versions },
  });
