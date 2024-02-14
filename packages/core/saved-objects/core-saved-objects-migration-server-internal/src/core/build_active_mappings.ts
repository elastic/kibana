/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * This file contains logic to build and diff the index mappings for a migration.
 */

import { cloneDeep } from 'lodash';
import type { SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';

/**
 * Creates an index mapping with the core properties required by saved object
 * indices, as well as the specified additional properties.
 *
 * @param typeDefinitions - the type definitions to build mapping from.
 */
export function buildActiveMappings(
  typeDefinitions: SavedObjectsTypeMappingDefinitions | SavedObjectsMappingProperties,
  override?: Partial<IndexMapping>
): IndexMapping {
  const mapping = getBaseMappings();

  const mergedProperties = validateAndMerge(mapping.properties, typeDefinitions);

  return cloneDeep({
    ...mapping,
    ...override,
    properties: mergedProperties,
  });
}

/**
 * Diffs the actual vs expected mappings. The properties are compared using md5 hashes stored in _meta, because
 * actual and expected mappings *can* differ, but if the md5 hashes stored in actual._meta.migrationMappingPropertyHashes
 * match our expectations, we don't require a migration. This allows ES to tack on additional mappings that Kibana
 * doesn't know about or expect, without triggering continual migrations.
 */
export function diffMappings(
  actual: IndexMapping,
  expected: IndexMapping,
  hashToVersionMap: Record<string, string>
) {
  if (actual.dynamic !== expected.dynamic) {
    return { changedProp: 'dynamic' };
  }

  if (!actual._meta?.migrationMappingPropertyHashes) {
    return { changedProp: '_meta' };
  }

  const changedProp = findChangedProp(
    actual._meta.migrationMappingPropertyHashes,
    expected._meta!.migrationMappingPropertyHashes,
    hashToVersionMap
  );

  return changedProp ? { changedProp: `properties.${changedProp}` } : undefined;
}

/**
 * Compares the actual vs expected mappings' hashes.
 * Returns a list with all the types that have been updated.
 */
export const getUpdatedTypes = ({
  actual,
  expected,
  hashToVersionMap,
}: {
  actual: IndexMapping;
  expected: IndexMapping;
  hashToVersionMap: Record<string, string>;
}): string[] => {
  if (!actual._meta?.migrationMappingPropertyHashes) {
    return Object.keys(expected._meta!.migrationMappingPropertyHashes!);
  }

  const updatedTypes = Object.keys(expected._meta!.migrationMappingPropertyHashes!).filter(
    (type) => {
      const indexHashOrVersion = actual._meta!.migrationMappingPropertyHashes![type];
      const appVersion = expected._meta!.migrationMappingPropertyHashes![type];
      return isTypeUpdated({ type, indexHashOrVersion, appVersion, hashToVersionMap });
    }
  );

  return updatedTypes;
};

interface HashToVersionMapParams {
  type: string;
  indexHashOrVersion: string;
  appVersion: string;
  hashToVersionMap: Record<string, string>;
}

/**
 *
 * @param type The saved object type to check
 * @param indexHashOrVersion The current "level" of the saved object, stored in the mappings._meta (it can be either a hash or a version)
 * @param appVersion The expected "level" of the saved object, according to the current Kibana version
 * @returns True if the type has changed since Kibana was last started
 */
function isTypeUpdated({
  type,
  indexHashOrVersion,
  appVersion,
  hashToVersionMap,
}: HashToVersionMapParams): boolean {
  const indexEquivalentVersion = hashToVersionMap[`${type}|${indexHashOrVersion}`];
  return indexHashOrVersion !== appVersion && indexEquivalentVersion !== appVersion;
}

// If something exists in actual, but is missing in expected, we don't
// care, as it could be a disabled plugin, etc, and keeping stale stuff
// around is better than migrating unecessesarily.
function findChangedProp(actual: any, expected: any, hashToVersionMap: Record<string, string>) {
  return Object.keys(expected).find((type) =>
    isTypeUpdated({
      type,
      indexHashOrVersion: actual[type],
      appVersion: expected[type],
      hashToVersionMap,
    })
  );
}

/**
 * Defines the mappings for the root fields, common to all saved objects.
 * These are present in all SO indices.
 *
 * @returns {IndexMapping}
 */
export function getBaseMappings(): IndexMapping {
  return {
    dynamic: 'strict',
    properties: {
      type: {
        type: 'keyword',
      },
      namespace: {
        type: 'keyword',
      },
      namespaces: {
        type: 'keyword',
      },
      originId: {
        type: 'keyword',
      },
      updated_at: {
        type: 'date',
      },
      created_at: {
        type: 'date',
      },
      references: {
        type: 'nested',
        properties: {
          name: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          id: {
            type: 'keyword',
          },
        },
      },
      coreMigrationVersion: {
        type: 'keyword',
      },
      typeMigrationVersion: {
        type: 'version',
      },
      managed: {
        type: 'boolean',
      },
    },
  };
}

function validateAndMerge(
  dest: SavedObjectsMappingProperties,
  source: SavedObjectsTypeMappingDefinitions | SavedObjectsMappingProperties
) {
  Object.keys(source).forEach((k) => {
    if (k.startsWith('_')) {
      throw new Error(`Invalid mapping "${k}". Mappings cannot start with _.`);
    }
    if (dest.hasOwnProperty(k)) {
      throw new Error(`Cannot redefine core mapping "${k}".`);
    }
  });

  return Object.assign(dest, source);
}
