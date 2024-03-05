/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import type { SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  IndexMappingMeta,
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
  _meta?: IndexMappingMeta
): IndexMapping {
  const mapping = getBaseMappings();

  return cloneDeep({
    ...mapping,
    properties: validateAndMerge(mapping.properties, typeDefinitions),
    ...(_meta && { _meta }),
  });
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
