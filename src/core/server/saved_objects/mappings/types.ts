/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
/**
 * Describe a saved object type mapping.
 *
 * @example
 * ```ts
 * const typeDefinition: SavedObjectsTypeMappingDefinition = {
 *   properties: {
 *     enabled: {
 *       type: "boolean"
 *     },
 *     sendUsageFrom: {
 *       ignore_above: 256,
 *       type: "keyword"
 *     },
 *     lastReported: {
 *       type: "date"
 *     },
 *     lastVersionChecked: {
 *       ignore_above: 256,
 *       type: "keyword"
 *     },
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectsTypeMappingDefinition {
  /** The dynamic property of the mapping, either `false` or `'strict'`. If
   * unspecified `dynamic: 'strict'` will be inherited from the top-level
   * index mappings. */
  dynamic?: false | 'strict';
  /** The underlying properties of the type mapping */
  properties: SavedObjectsMappingProperties;
}

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

/**
 * Describe the fields of a {@link SavedObjectsTypeMappingDefinition | saved object type}.
 *
 * @public
 */
export interface SavedObjectsMappingProperties {
  [field: string]: SavedObjectsFieldMapping;
}

/**
 * Describe a {@link SavedObjectsTypeMappingDefinition | saved object type mapping} field.
 *
 * Please refer to {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html | elasticsearch documentation}
 * For the mapping documentation
 *
 * @public
 */
export type SavedObjectsFieldMapping = estypes.MappingProperty & {
  /**
   * The dynamic property of the mapping, either `false` or `'strict'`. If
   * unspecified `dynamic: 'strict'` will be inherited from the top-level
   * index mappings.
   *
   * Note: To limit the number of mapping fields Saved Object types should
   * *never* use `dynamic: true`.
   */
  dynamic?: false | 'strict';
};

/** @internal */
export interface IndexMapping {
  dynamic?: boolean | 'strict';
  properties: SavedObjectsMappingProperties;
  _meta?: IndexMappingMeta;
}

/** @internal */
export interface IndexMappingMeta {
  // A dictionary of key -> md5 hash (e.g. 'dashboard': '24234qdfa3aefa3wa')
  // with each key being a root-level mapping property, and each value being
  // the md5 hash of that mapping's value when the index was created.
  migrationMappingPropertyHashes?: { [k: string]: string };
}
