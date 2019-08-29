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
// @ts-ignore
import { buildEsQuery, getEsQueryConfig } from '@kbn/es-query';
// @ts-ignore
import { timezoneProvider } from 'ui/vis/lib/timezone';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

const TimelionRequestHandlerProvider = function(Private: any, $http: any, config: any) {
  const timezone = Private(timezoneProvider)();

  return {
    name: 'timelion',
    handler({
      timeRange,
      filters,
      query,
      visParams,
    }: {
      timeRange: any;
      filters: any;
      query: any;
      visParams: any;
    }) {
      return new Promise((resolve, reject) => {
        const expression = visParams.expression;
        if (!expression) return;
        const esQueryConfigs = getEsQueryConfig(config);
        const httpResult = $http
          .post('../api/timelion/run', {
            sheet: [expression],
            extended: {
              es: {
                filter: buildEsQuery(undefined, query, filters, esQueryConfigs),
              },
            },
            time: _.extend(timeRange, {
              interval: visParams.interval,
              timezone,
            }),
          })
          .then((resp: any) => resp.data)
          .catch((resp: any) => {
            throw resp.data;
          });

        httpResult
          .then(function(resp: any) {
            resolve(resp);
          })
          .catch(function(resp: any) {
            const err = new Error(resp.message);
            err.stack = resp.stack;
            toastNotifications.addError(err, {
              title: i18n.translate('timelion.requestHandlerErrorTitle', {
                defaultMessage: 'Timelion request error',
              }),
            });
            reject(err);
          });
      });
    },
  };
};

export { TimelionRequestHandlerProvider };
