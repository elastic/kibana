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

// FieldMapping isn't 1:1 with the options available,
// modify as needed.
export interface CoreFieldMapping {
  type: string;
  fields?: {
    [subfield: string]: {
      type: string;
    };
  };
}

// FieldMapping isn't 1:1 with the options available,
// modify as needed.
export interface ComplexFieldMapping {
  dynamic?: string;
  type?: string;
  properties: MappingProperties;
}

export type FieldMapping = CoreFieldMapping | ComplexFieldMapping;

export interface MappingProperties {
  [field: string]: FieldMapping;
}

export interface SavedObjectsMapping {
  pluginId: string;
  properties: MappingProperties;
}

export interface MappingMeta {
  // A dictionary of key -> md5 hash (e.g. 'dashboard': '24234qdfa3aefa3wa')
  // with each key being a root-level mapping property, and each value being
  // the md5 hash of that mapping's value when the index was created.
  migrationMappingPropertyHashes?: { [k: string]: string };
}

// IndexMapping isn't 1:1 with the options available,
// modify as needed.
export interface IndexMapping {
  dynamic?: string;
  properties: MappingProperties;
  _meta?: MappingMeta;
}
