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
import { createStateContainer } from '../../../../../../../plugins/kibana_utils/public';
import { createKbnUrlStateStorage } from '../../../../../../../plugins/kibana_utils/public';
import { syncState } from '../../../../../../../plugins/kibana_utils/public';

interface UrlStateParams {
  columns: string[];
  filters: any;
  predecessorCount: string;
  sort: [string, string];
  successorCount: string;
}

export function getAppState(defaultStepSize: string, timeFieldName: string) {
  const stateStorage = createKbnUrlStateStorage();
  const initialStateFromUrl = stateStorage.get('_a');
  const defaultState = createDefaultAppState(defaultStepSize, timeFieldName);
  const initialState = {
    ...defaultState,
    ...(_.cloneDeep(initialStateFromUrl) as UrlStateParams),
  } as UrlStateParams;

  const stateContainer = createStateContainer(initialState) as any;

  const { start, stop } = syncState({
    storageKey: '_a',
    stateContainer,
    stateStorage,
  });

  return { stateContainer, initialState, start, stop };
}

function createDefaultAppState(defaultSize: string, timeFieldName: string) {
  return {
    columns: ['_source'],
    filters: [],
    predecessorCount: parseInt(defaultSize, 10),
    sort: [timeFieldName, 'desc'],
    successorCount: parseInt(defaultSize, 10),
  };
}
