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

import { APICaller } from 'src/core/server/elasticsearch';
import { Config } from 'src/core/server/config';
import { retryCallCluster } from '../../../elasticsearch/retry_call_cluster';
import { KibanaMigrator } from '../../migrations';
import { SavedObjectsSchema } from '../../schema';
import { getRootPropertiesObjects } from '../../mappings';
import { SavedObjectsSerializer } from '../../serialization';
import { SavedObjectsRepository } from '.';

export const createRepository = (
  migrator: KibanaMigrator,
  schema: SavedObjectsSchema,
  config: Config,
  indexName: string,
  callCluster: APICaller,
  extraTypes: string[] = []
) => {
  const mappings = migrator.getActiveMappings();
  const allTypes = Object.keys(getRootPropertiesObjects(mappings));
  const serializer = new SavedObjectsSerializer(schema);
  const visibleTypes = allTypes.filter(type => !schema.isHiddenType(type));

  const missingTypeMappings = extraTypes.filter(type => !allTypes.includes(type));
  if (missingTypeMappings.length > 0) {
    throw new Error(
      `Missing mappings for saved objects types: '${missingTypeMappings.join(', ')}'`
    );
  }

  const allowedTypes = [...new Set(visibleTypes.concat(extraTypes))];

  return new SavedObjectsRepository({
    index: indexName,
    config,
    migrator,
    mappings,
    schema,
    serializer,
    allowedTypes,
    callCluster: retryCallCluster(callCluster),
  });
};
