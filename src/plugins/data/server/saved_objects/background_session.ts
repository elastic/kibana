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

import { SavedObjectsType } from 'kibana/server';

export const BACKGROUND_SESSION_TYPE = 'background-session';

export const backgroundSessionMapping: SavedObjectsType = {
  name: BACKGROUND_SESSION_TYPE,
  namespaceType: 'single',
  hidden: true,
  mappings: {
    properties: {
      name: {
        type: 'keyword',
      },
      created: {
        type: 'date',
      },
      expires: {
        type: 'date',
      },
      status: {
        type: 'keyword',
      },
      appId: {
        type: 'keyword',
      },
      urlGeneratorId: {
        type: 'keyword',
      },
      initialState: {
        type: 'object',
        enabled: false,
      },
      restoreState: {
        type: 'object',
        enabled: false,
      },
      idMapping: {
        type: 'object',
        enabled: false,
      },
    },
  },
};
