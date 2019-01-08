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

/*
 * This file contains logic to build and diff the index mappings for a migration.
 */

import crypto from 'crypto';
import _ from 'lodash';
import { IndexMapping, MappingProperties } from './call_cluster';

// rison-node is untyped, so we require rather than import, to avoid TS warnings...
// tslint:disable-next-line:no-var-requires
const rison = require('rison-node');

// The diff result, indicating which root-level property change triggers a migration.
export interface MappingDiff {
  changedProp: string;
}

/**
 * Creates an index mapping with the core properties required by saved object
 * indices, as well as the specified additional properties.
 *
 * @param {Opts} opts
 * @prop {MappingDefinition} properties - The mapping's properties
 * @returns {IndexMapping}
 */
export function buildActiveMappings({
  properties,
}: {
  properties: MappingProperties;
}): IndexMapping {
  const mapping = defaultMapping();

  properties = validateAndMerge(mapping.doc.properties, properties);

  return _.cloneDeep({
    doc: {
      ...mapping.doc,
      properties,
      _meta: {
        migrationMappingHash: md5Values(properties),
      },
    },
  });
}

/**
 * Diffs the actual vs expected mappings. The properties are compared using md5 hashes stored in _meta, because
 * actual and expected mappings *can* differ, but if the md5 hashes stored in actual.doc._meta.migrationMappingHash
 * match our expectations, we don't require a migration. This allows ES to tack on additional mappings that Kibana
 * doesn't know about or expect, without triggering continual migrations.
 */
export function diffMappings(
  actual: IndexMapping,
  expected: IndexMapping
): MappingDiff | undefined {
  if (actual.doc.dynamic !== expected.doc.dynamic) {
    return { changedProp: 'doc.dynamic' };
  }

  if (!actual.doc._meta || !actual.doc._meta.migrationMappingHash) {
    return { changedProp: 'doc._meta' };
  }

  const changedProp = findChangedProp(
    actual.doc._meta.migrationMappingHash,
    expected.doc._meta!.migrationMappingHash
  );

  return changedProp ? { changedProp: `doc.properties.${changedProp}` } : undefined;
}

// Convert an object to an md5 hash string, using rison so we get a stable serialization
function md5Object(obj: any) {
  return crypto
    .createHash('md5')
    .update(rison.encode(obj))
    .digest('hex');
}

// Convert an object's values to md5 hash strings
function md5Values(obj: any) {
  return _.mapValues(obj, md5Object);
}

// If something exists in actual, but is missing in expected, we don't
// care, as it could be a disabled plugin, etc, and keeping stale stuff
// around is better than migrating unecessesarily.
function findChangedProp(actual: any, expected: any) {
  return Object.keys(expected).find(k => actual[k] !== expected[k]);
}

/**
 * These mappings are required for any saved object index.
 *
 * @returns {IndexMapping}
 */
function defaultMapping(): IndexMapping {
  return {
    doc: {
      dynamic: 'strict',
      properties: {
        config: {
          dynamic: 'true',
          properties: {
            buildNum: {
              type: 'keyword',
            },
          },
        },
        migrationVersion: {
          dynamic: 'true',
          type: 'object',
        },
        type: {
          type: 'keyword',
        },
        namespace: {
          type: 'keyword',
        },
        updated_at: {
          type: 'date',
        },
      },
    },
  };
}

function validateAndMerge(dest: MappingProperties, source: MappingProperties) {
  Object.keys(source).forEach(k => {
    if (k.startsWith('_')) {
      throw new Error(`Invalid mapping "${k}". Mappings cannot start with _.`);
    }

    if (dest.hasOwnProperty(k)) {
      throw new Error(`Cannot redefine core mapping "${k}".`);
    }
  });

  return Object.assign(dest, source);
}
