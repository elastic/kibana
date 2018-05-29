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

import { IndexMappings } from './index_mappings';

/**
 *  The default mappings used for the kibana index. This is
 *  extended via uiExports type "mappings". See the kibana
 *  and timelion plugins for examples.
 *  @type {EsMappingDsl}
 */
const BASE_SAVED_OBJECT_MAPPINGS = {
  doc: {
    dynamic: 'strict',
    properties: {
      type: {
        type: 'keyword'
      },
      updated_at: {
        type: 'date'
      },
      config: {
        dynamic: true,
        properties: {
          buildNum: {
            type: 'keyword'
          }
        }
      },
    }
  }
};

export function kibanaIndexMappingsMixin(kbnServer, server) {
  const mappings = new IndexMappings(
    BASE_SAVED_OBJECT_MAPPINGS,
    kbnServer.uiExports.savedObjectMappings
  );

  /**
   *  Get the mappings dsl that we expect to see in the
   *  Kibana index. Used by the elasticsearch plugin to create
   *  and update the kibana index. Also used by the SavedObjectsClient
   *  to determine the properties defined in the mapping as well as
   *  things like the "rootType".
   *
   *  See `src/server/mappings/lib/index.js` for helpers useful for reading
   *  the EsMappingDsl object.
   *
   *  @method server.getKibanaIndexMappingsDsl
   *  @returns {EsMappingDsl}
   */
  server.decorate('server', 'getKibanaIndexMappingsDsl', () => {
    return mappings.getDsl();
  });
}
