/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import Semver from 'semver';
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

/** The index `_meta` holds newer model versions than this Kibana, for the given types. */
export interface NewerModelVersions {
  readonly type: 'newer_model_versions';
  readonly types: string[];
}

/** Computes the `_meta` to write from the current one, unless the current one is newer. */
export type IndexMetaUpdate = (
  meta: IndexMappingMeta
) => Either.Either<NewerModelVersions, IndexMappingMeta>;

const findNewerTypes = (current: VirtualVersionMap = {}, versions: VirtualVersionMap): string[] =>
  Object.entries(versions)
    .filter(([type, version]) => current[type] !== undefined && Semver.gt(current[type], version))
    .map(([type]) => type);

/**
 * `putMapping` replaces `_meta` as a whole, so versions are merged into the current `_meta`.
 * Fields that v3 doesn't own (e.g. zdt's `migrationState`) are preserved, which keeps rollbacks working.
 * Versions are never lowered: a newer Kibana may have updated the index since `INIT` evaluated it.
 */
const mergeVersions =
  (field: 'mappingVersions' | 'docVersions', versions: VirtualVersionMap): IndexMetaUpdate =>
  (meta) => {
    const newerTypes = findNewerTypes(meta[field], versions);
    return newerTypes.length > 0
      ? Either.left({ type: 'newer_model_versions', types: newerTypes })
      : Either.right({ ...meta, [field]: { ...meta[field], ...versions } });
  };

/** See {@link mergeVersions}. */
export const mergeMappingVersions = (versions: VirtualVersionMap): IndexMetaUpdate =>
  mergeVersions('mappingVersions', versions);

/** See {@link mergeVersions}. */
export const mergeDocVersions = (versions: VirtualVersionMap): IndexMetaUpdate =>
  mergeVersions('docVersions', versions);
