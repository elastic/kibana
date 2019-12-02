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

import { RequestHandlerContext, KibanaRequest } from 'src/core/server';
import _ from 'lodash';
import { getPanelData } from './vis_data/get_panel_data';

interface GetVisDataResponse {
  [key: string]: GetVisDataPanel;
}

interface GetVisDataPanel {
  id: string;
  series: GetVisDataSeries[];
}

interface GetVisDataSeries {
  id: string;
  label: string;
  data: GetVisDataDataPoint[];
}

type GetVisDataDataPoint = [number, number];

export type GetVisData = (
  requestContext: RequestHandlerContext,
  request: KibanaRequest
) => Promise<GetVisDataResponse>;

export function getVisData(
  requestContext: RequestHandlerContext,
  request: KibanaRequest
): Promise<GetVisDataResponse> {
  // NOTE / TODO: This facade has been put in place to make migrating to the New Platform easier. It
  // removes the need to refactor many layers of dependencies on "req", and instead just augments the top
  // level object passed from here. The layers should be refactored fully at some point, but for now
  // this works and we are still using the New Platform services for these vis data portions.
  const options: any = {
    payload: request.body,
    getUiSettingsService: () => requestContext.core.uiSettings.client,
    getSavedObjectsClient: () => requestContext.core.savedObjects.client,
    server: {
      plugins: {
        elasticsearch: {
          getCluster: () => {
            return {
              callWithRequest: async (req: any, endpoint: string, params: any) => {
                return await requestContext.core.elasticsearch.dataClient.callAsCurrentUser(
                  endpoint,
                  params
                );
              },
            };
          },
        },
      },
    },
  };
  const promises = options.payload.panels.map(getPanelData(options));
  return Promise.all(promises).then(res => {
    return res.reduce((acc, data) => {
      return _.assign(acc as any, data);
    }, {});
  }) as Promise<GetVisDataResponse>;
}
