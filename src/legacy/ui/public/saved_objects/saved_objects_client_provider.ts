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

import { SavedObjectsClient } from 'src/core/public';
import chrome from '../chrome';
import { PromiseService } from '../promises';

type Args<T extends (...args: any[]) => any> = T extends (...args: infer X) => any ? X : never;

// Provide an angular wrapper around savedObjectClient so all actions get resolved in an Angular Promise
// If you do not need the promise to execute in an angular digest cycle then you should not use this
// and get savedObjectClient directly from chrome.
export function SavedObjectsClientProvider(Promise: PromiseService) {
  const savedObjectsClient = chrome.getSavedObjectsClient();

  return {
    create: (...args: Args<SavedObjectsClient['create']>) => {
      return Promise.resolve(savedObjectsClient.create(...args));
    },
    bulkCreate: (...args: Args<SavedObjectsClient['bulkCreate']>) => {
      return Promise.resolve(savedObjectsClient.bulkCreate(...args));
    },
    delete: (...args: Args<SavedObjectsClient['delete']>) => {
      return Promise.resolve(savedObjectsClient.delete(...args));
    },
    find: (...args: Args<SavedObjectsClient['find']>) => {
      return Promise.resolve(savedObjectsClient.find(...args));
    },
    get: (...args: Args<SavedObjectsClient['get']>) => {
      return Promise.resolve(savedObjectsClient.get(...args));
    },
    bulkGet: (...args: Args<SavedObjectsClient['bulkGet']>) => {
      return Promise.resolve(savedObjectsClient.bulkGet(...args));
    },
    update: (...args: Args<SavedObjectsClient['update']>) => {
      return Promise.resolve(savedObjectsClient.update(...args));
    },
  };
}
