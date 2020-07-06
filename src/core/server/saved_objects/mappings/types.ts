/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
  /** The dynamic property of the mapping. either `false` or 'strict'. Defaults to `false` */
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
export type SavedObjectsFieldMapping =
  | SavedObjectsCoreFieldMapping
  | SavedObjectsComplexFieldMapping;

/** @internal */
export interface IndexMapping {
  dynamic?: string;
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

/**
 * See {@link SavedObjectsFieldMapping} for documentation.
 *
 * @public
 */
export interface SavedObjectsCoreFieldMapping {
  type: string;
  null_value?: number | boolean | string;
  index?: boolean;
  doc_values?: boolean;
  enabled?: boolean;
  fields?: {
    [subfield: string]: {
      type: string;
      ignore_above?: number;
    };
  };
}

/**
 * See {@link SavedObjectsFieldMapping} for documentation.
 *
 * Note: this type intentially doesn't include a type definition for defining
 * the `dynamic` mapping parameter. Saved Object fields should always inherit
 * the `dynamic: 'strict'` paramater. If you are unsure of the shape of your
 * data use `type: 'object', enabled: false` instead.
 *
 * @public
 */
export interface SavedObjectsComplexFieldMapping {
  doc_values?: boolean;
  type?: string;
  properties: SavedObjectsMappingProperties;
}
