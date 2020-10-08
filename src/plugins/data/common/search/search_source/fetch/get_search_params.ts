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

import { UI_SETTINGS } from '../../../constants';
import { GetConfigFn } from '../../../types';
import { ISearchRequestParams } from '../../index';
import { SearchRequest } from './types';

const sessionId = Date.now();

export function getSearchParams(getConfig: GetConfigFn) {
  return {
    preference: getPreference(getConfig),
  };
}

export function getPreference(getConfig: GetConfigFn) {
  const setRequestPreference = getConfig(UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE);
  if (setRequestPreference === 'sessionId') return sessionId;
  return setRequestPreference === 'custom'
    ? getConfig(UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE)
    : undefined;
}

/** @public */
// TODO: Could provide this on runtime contract with dependencies
// already wired up.
export function getSearchParamsFromRequest(
  searchRequest: SearchRequest,
  dependencies: { getConfig: GetConfigFn }
): ISearchRequestParams {
  const { getConfig } = dependencies;
  const searchParams = getSearchParams(getConfig);

  return {
    index: searchRequest.index.title || searchRequest.index,
    body: searchRequest.body,
    ...searchParams,
  };
}
