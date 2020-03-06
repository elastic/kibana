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

import { SavedObjectsType } from '../types';

export const config: SavedObjectsType = {
  name: 'config',
  hidden: false,
  namespaceAgnostic: false,
  mappings: {
    dynamic: true as any, // TODO: check if can be switched to false, else adapt the type to allow true
    properties: {
      buildNum: {
        type: 'keyword',
      },
    },
  },
  management: {
    importableAndExportable: true,
    getInAppUrl() {
      return {
        path: `/app/kibana#/management/kibana/settings`,
        uiCapabilitiesPath: 'advancedSettings.show',
      };
    },
    getTitle(obj) {
      return `Advanced Settings [${obj.id}]`;
    },
  },
};
