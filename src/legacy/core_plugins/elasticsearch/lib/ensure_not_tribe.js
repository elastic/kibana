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

import { get } from 'lodash';

export function ensureNotTribe(callWithInternalUser) {
  return callWithInternalUser('nodes.info', {
    nodeId: '_local',
    filterPath: 'nodes.*.settings.tribe'
  })
    .then(function (info) {
      const nodeId = Object.keys(info.nodes || {})[0];
      const tribeSettings = get(info, ['nodes', nodeId, 'settings', 'tribe']);

      if (tribeSettings) {
        throw new Error('Kibana does not support using tribe nodes as the primary elasticsearch connection.');
      }

      return true;
    });
}
