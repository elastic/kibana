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

import _ from 'lodash';
import { SavedObject } from 'ui/saved_objects/types';
import { SavedObjectsClient } from 'kibana/public';

export function intializeSavedObject(
  esType: string,
  savedObject: SavedObject,
  savedObjectsClient: SavedObjectsClient,
  afterESResp: any,
  customInit: any
) {
  // ensure that the esType is defined
  if (!esType) throw new Error('You must define a type name to use SavedObject objects.');

  return Promise.resolve()
    .then(() => {
      // If there is not id, then there is no document to fetch from elasticsearch
      if (!savedObject.id) {
        // just assign the defaults and be done
        _.assign(savedObject, savedObject.defaults);
        return savedObject.hydrateIndexPattern!().then(() => {
          return afterESResp.call(savedObject);
        });
      }

      // fetch the object from ES
      return savedObjectsClient
        .get(esType, savedObject.id)
        .then(resp => {
          // temporary compatability for savedObjectsClient
          return {
            _id: resp.id,
            _type: resp.type,
            _source: _.cloneDeep(resp.attributes),
            references: resp.references,
            found: !!resp._version,
          };
        })
        .then(savedObject.applyESResp)
        .catch(savedObject.applyEsResp);
    })
    .then(() => customInit.call(savedObject))
    .then(() => savedObject);
}
