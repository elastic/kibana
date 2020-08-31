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

import { parseUrl, stringify } from 'query-string';
import { DashboardConstants } from '../index';

/** *
 * Returns relative dashboard URL with added embeddableType and embeddableId query params
 * eg.
 * input: url: #/create?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now)), embeddableId: 12345
 * output: #/create?addEmbeddableType=visualization&addEmbeddableId=12345&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))
 * @param url dasbhoard hash part of the url
 * @param embeddableId id of the saved embeddable
 * @param embeddableType type of the embeddable
 */
export function addEmbeddableToDashboardUrl(
  dashboardUrl: string,
  embeddableId: string,
  embeddableType: string
) {
  const { url, query } = parseUrl(dashboardUrl);

  if (embeddableId) {
    query[DashboardConstants.ADD_EMBEDDABLE_TYPE] = embeddableType;
    query[DashboardConstants.ADD_EMBEDDABLE_ID] = embeddableId;
  }

  return `${url}?${stringify(query)}`;
}
