/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsTypeMappingDefinition,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';
import type { VirtualVersionMap } from '../model_version';

/**
 * A map of {@link SavedObjectsTypeMappingDefinition | saved object type mappings}
 *
 * @example
 * ```ts
 * const mappings: SavedObjectsTypeMappingDefinitions = {
 *   someType: {
 *     properties: {
 *       enabled: {
 *         type: "boolean"
 *       },
 *       field: {
 *         type: "keyword"
 *       },
 *     },
 *   },
 *   anotherType: {
 *     properties: {
 *       enabled: {
 *         type: "boolean"
 *       },
 *       lastReported: {
 *         type: "date"
 *       },
 *     },
 *   },

 * }
 * ```
 * @remark This is the format for the legacy `mappings.json` savedObject mapping file.
 *
 * @internal
 */
export interface SavedObjectsTypeMappingDefinitions {
  [type: string]: SavedObjectsTypeMappingDefinition;
}

/** @internal */
export interface IndexMapping {
  dynamic?: boolean | 'strict';
  properties: SavedObjectsMappingProperties;
  _meta?: IndexMappingMeta;
}

/** @internal */
export type IndexTypesMap = Record<string, string[]>;

/** @internal */
export interface CommonAlgoIndexMappingMeta {
  /**
   * The current virtual version of the mapping of the index.
   */
  mappingVersions?: VirtualVersionMap;
}

/** @internal */
export interface V2AlgoIndexMappingMeta extends CommonAlgoIndexMappingMeta {
  /**
   * A dictionary of key -> md5 hash (e.g. 'dashboard': '24234qdfa3aefa3wa')
   * with each key being a root-level mapping property, and each value being
   * the md5 hash of that mapping's value when the index was created.
   *
   * @remark: Only defined for indices using the v2 migration algorithm.
   * @deprecated Replaced by mappingVersions (FIPS-compliant initiative)
   */
  migrationMappingPropertyHashes?: { [k: string]: string };
  /**
   * A map that tells what are the SO types stored in each index
   *
   * @remark: Only defined for indices using the v2 migration algorithm.
   */
  indexTypesMap?: IndexTypesMap;
}

/** @internal */
export interface ZdtAlgoIndexMappingMeta extends CommonAlgoIndexMappingMeta {
  /**
   * The current virtual versions of the documents of the index.
   */
  docVersions?: VirtualVersionMap;
  /**
   * Info about the current state of the migration.
   * Should only be present if a migration is in progress or was interrupted.
   *
   * @remark: Only defined for indices using the zdt migration algorithm.
   */
  migrationState?: IndexMappingMigrationStateMeta;
}

/** @internal */
export type IndexMappingMeta = V2AlgoIndexMappingMeta & ZdtAlgoIndexMappingMeta;

/** @internal */
export interface IndexMappingMigrationStateMeta {
  /**
   * Indicates that the algorithm is currently converting the documents.
   */
  convertingDocuments: boolean;
}
