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
import { SavedObjectsClientProvider } from '../saved_objects';

export function IndexPatternsGetProvider(Private) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  // many places may require the id list, so we will cache it separately
  // didn't incorporate with the indexPattern cache to prevent id collisions.
  let cachedIdPromise;

  const get = function (field) {
    if (field === 'id' && cachedIdPromise) {
      // return a clone of the cached response
      return cachedIdPromise.then(function (cachedResp) {
        return _.clone(cachedResp);
      });
    }

    const promise = savedObjectsClient.find({
      type: 'index-pattern',
      fields: [],
      perPage: 10000
    }).then(resp => {
      return resp.savedObjects.map(obj => _.get(obj, field));
    });

    if (field === 'id') {
      cachedIdPromise = promise;
    }

    // ensure that the response stays pristine by cloning it here too
    return promise.then(function (resp) {
      return _.clone(resp);
    });
  };

  const retFunction = (field) => {
    const getter = get.bind(get, field);
    if (field === 'id') {
      getter.clearCache = function () {
        cachedIdPromise = null;
      };
    }
    return getter;
  };

  retFunction.multiple = async fields => {
    return (await savedObjectsClient.find({ type: 'index-pattern', fields, perPage: 10000 })).savedObjects;
  };

  return retFunction;
}
