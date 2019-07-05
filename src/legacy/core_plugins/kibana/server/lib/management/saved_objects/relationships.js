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

import { pick } from 'lodash';
import { injectMetaAttributes } from './inject_meta_attributes';

export async function findRelationships(type, id, options = {}) {
  const {
    size,
    savedObjectsClient,
    savedObjectTypes,
    savedObjectsManagement,
  } = options;

  const { references = [] } = await savedObjectsClient.get(type, id);

  // Use a map to avoid duplicates, it does happen but have a different "name" in the reference
  const referencedToBulkGetOpts = new Map(
    references.map(({ type, id }) => [`${type}:${id}`, { id, type }])
  );

  const [referencedObjects, referencedResponse] = await Promise.all([
    referencedToBulkGetOpts.size > 0
      ? savedObjectsClient.bulkGet([...referencedToBulkGetOpts.values()])
      : Promise.resolve({ saved_objects: [] }),
    savedObjectsClient.find({
      hasReference: { type, id },
      perPage: size,
      type: savedObjectTypes,
    }),
  ]);

  return [].concat(
    referencedObjects.saved_objects
      .map(obj => injectMetaAttributes(obj, savedObjectsManagement))
      .map(extractCommonProperties)
      .map(obj => ({
        ...obj,
        relationship: 'child',
      })),
    referencedResponse.saved_objects
      .map(obj => injectMetaAttributes(obj, savedObjectsManagement))
      .map(extractCommonProperties)
      .map(obj => ({
        ...obj,
        relationship: 'parent',
      })),
  );
}

function extractCommonProperties(savedObject) {
  return pick(savedObject, ['id', 'type', 'meta']);
}
