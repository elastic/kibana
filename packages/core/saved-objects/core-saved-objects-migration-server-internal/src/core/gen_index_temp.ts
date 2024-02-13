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

import crypto from 'crypto';
import { cloneDeep, mapValues } from 'lodash';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';
import {
  getVirtualVersionMap,
  type IndexMapping,
  type SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';
import * as HASH_TO_VERSION_MAP from './hash_to_version_map.json';

/**
 * Creates an index mapping with the core properties required by saved object
 * indices, as well as the specified additional properties.
 *
 * @param typeDefinitions - the type definitions to build mapping from.
 */
export function buildActiveMappings(
  typeDefinitions: SavedObjectsTypeMappingDefinitions | SavedObjectsMappingProperties,
  registry: ISavedObjectTypeRegistry
): IndexMapping {
  const mapping = getBaseMappings();

  const mergedProperties = validateAndMerge(mapping.properties, typeDefinitions);

  // const indexHashes = md5Values(mergedProperties);
  // const virtualVersions = getVirtualVersionMap(registry.getAllTypes());

  // console.log('INDEX ', index);
  // Object.entries(indexHashes).forEach(([type, hash]) => {
  //   if (virtualVersions[type]) {
  //     console.log(`"${type}|${hash}": '${virtualVersions[type]}',`);
  //   }
  // });

  return cloneDeep({
    ...mapping,
    properties: mergedProperties,
    _meta: {
      // migrationMappingPropertyHashes: md5Values(mergedProperties),
      migrationMappingPropertyHashes: getVirtualVersionMap(registry.getAllTypes()),
    },
  });
}

/**
 * Diffs the actual vs expected mappings. The properties are compared using md5 hashes stored in _meta, because
 * actual and expected mappings *can* differ, but if the md5 hashes stored in actual._meta.migrationMappingPropertyHashes
 * match our expectations, we don't require a migration. This allows ES to tack on additional mappings that Kibana
 * doesn't know about or expect, without triggering continual migrations.
 */
export function diffMappings(actual: IndexMapping, expected: IndexMapping) {
  if (actual.dynamic !== expected.dynamic) {
    return { changedProp: 'dynamic' };
  }

  if (!actual._meta?.migrationMappingPropertyHashes) {
    return { changedProp: '_meta' };
  }

  const changedProp = findChangedProp(
    actual._meta.migrationMappingPropertyHashes,
    expected._meta!.migrationMappingPropertyHashes
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
}: {
  actual: IndexMapping;
  expected: IndexMapping;
}): string[] => {
  if (!actual._meta?.migrationMappingPropertyHashes) {
    return Object.keys(expected._meta!.migrationMappingPropertyHashes!);
  }

  const updatedTypes = Object.keys(expected._meta!.migrationMappingPropertyHashes!).filter(
    (type) => {
      const actualHashOrVersion = actual._meta!.migrationMappingPropertyHashes![type];
      const expectedVersion = expected._meta!.migrationMappingPropertyHashes![type];
      return isTypeUpdated(type, actualHashOrVersion, expectedVersion);
    }
  );

  return updatedTypes;
};

/**
 *
 * @param type The saved object type to check
 * @param appHashOrVersion The current "level" of the saved object, stored in the mappings._meta (it can be either a hash or a version)
 * @param modelVersion The expected "level" of the saved object, according to the current Kibana version
 * @returns True if the type has changed since Kibana was last started
 */
function isTypeUpdated(type: string, appHashOrVersion: string, modelVersion: string): boolean {
  const appEquivalentVersion = (HASH_TO_VERSION_MAP as Record<string, string>)[
    `${type}|${appHashOrVersion}`
  ];

  return appHashOrVersion !== modelVersion && appEquivalentVersion !== modelVersion;
}

// Convert an object to an md5 hash string, using a stable serialization (canonicalStringify)
function md5Object(obj: any) {
  return crypto.createHash('md5').update(canonicalStringify(obj)).digest('hex');
}

// JSON.stringify is non-canonical, meaning the same object may produce slightly
// different JSON, depending on compiler optimizations (e.g. object keys
// are not guaranteed to be sorted). This function consistently produces the same
// string, if passed an object of the same shape. If the outpuf of this function
// changes from one release to another, migrations will run, so it's important
// that this function remains stable across releases.
function canonicalStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalStringify)}]`;
  }

  if (!obj || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  const keys = Object.keys(obj);

  // This is important for properly handling Date
  if (!keys.length) {
    return JSON.stringify(obj);
  }

  const sortedObj = keys
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}: ${canonicalStringify(obj[k])}`);

  return `{${sortedObj}}`;
}

// Convert an object's values to md5 hash strings
function md5Values(obj: any) {
  return mapValues(obj, md5Object);
}

// If something exists in actual, but is missing in expected, we don't
// care, as it could be a disabled plugin, etc, and keeping stale stuff
// around is better than migrating unecessesarily.
function findChangedProp(actual: any, expected: any) {
  return Object.keys(expected).find((type) => isTypeUpdated(type, actual[type], expected[type]));
}

/**
 * These mappings are required for any saved object index.
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
