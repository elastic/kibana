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

import { PersistedState } from '../../../../../../../plugins/visualizations/public';
import { calculateObjectHash } from '../../../../../../../plugins/kibana_utils/common';
import { ExprVis } from '../expressions/vis';

enum Status {
  AGGS = 'aggs',
  DATA = 'data',
  PARAMS = 'params',
  RESIZE = 'resize',
  TIME = 'time',
  UI_STATE = 'uiState',
}

/**
 * Checks whether the hash of a specific key in the given oldStatus has changed
 * compared to the new valueHash passed.
 */
function hasHashChanged<T extends string>(
  valueHash: string,
  oldStatus: { [key in T]?: string },
  name: T
): boolean {
  const oldHash = oldStatus[name];
  return oldHash !== valueHash;
}

function getUpdateStatus<T extends Status>(
  requiresUpdateStatus: T[] = [],
  obj: any,
  param: { vis: ExprVis; visData: any; uiState: PersistedState }
): { [reqStats in T]: boolean } {
  const status = {} as { [reqStats in Status]: boolean };

  // If the vis type doesn't need update status, skip all calculations
  if (requiresUpdateStatus.length === 0) {
    return status;
  }

  if (!obj._oldStatus) {
    obj._oldStatus = {};
  }

  for (const requiredStatus of requiresUpdateStatus) {
    let hash;
    // Calculate all required status updates for this visualization
    switch (requiredStatus) {
      case Status.AGGS:
        status.aggs = true;
        break;
      case Status.DATA:
        hash = calculateObjectHash(param.visData);
        status.data = hasHashChanged(hash, obj._oldStatus, 'data');
        obj._oldStatus.data = hash;
        break;
      case Status.PARAMS:
        status.params = true;
        break;
      case Status.RESIZE:
        status.resize = true;
        break;
      case Status.TIME:
        status.time = true;
        break;
      case Status.UI_STATE:
        hash = calculateObjectHash(param.uiState);
        status.uiState = hasHashChanged(hash, obj._oldStatus, 'uiState');
        obj._oldStatus.uiState = hash;
        break;
    }
  }

  return status;
}

export { getUpdateStatus, Status };
