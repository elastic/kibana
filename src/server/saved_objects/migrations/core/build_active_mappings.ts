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
 * This file contains logic to build the index mappings for a migration.
*/

import _ from 'lodash';
import { IndexMapping, MappingProperties } from './call_cluster';

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
  return _.cloneDeep({
    doc: {
      ...mapping.doc,
      properties: validateAndMerge(mapping.doc.properties, properties),
    },
  });
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
