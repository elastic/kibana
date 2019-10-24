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

import { createGetterSetter, Get, Set } from './create_getter_setter';
import { CoreStart } from '../../../../core/public';
import { KUSavedObjectClient, createSavedObjectsClient } from './saved_objects_client';

interface Return {
  getCoreStart: Get<CoreStart>;
  setCoreStart: Set<CoreStart>;
  savedObjects: KUSavedObjectClient;
}

export const createKibanaUtilsCore = (): Return => {
  const [getCoreStart, setCoreStart] = createGetterSetter<CoreStart>('CoreStart');
  const savedObjects = createSavedObjectsClient(getCoreStart);

  return {
    getCoreStart,
    setCoreStart,
    savedObjects,
  };
};
