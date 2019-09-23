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

// @ts-ignore
import { buildEsQuery, getEsQueryConfig, Filter } from '@kbn/es-query';
// @ts-ignore
import { timezoneProvider } from 'ui/vis/lib/timezone';
import { npSetup } from 'ui/new_platform';
import { KIBANA_CONTEXT_NAME } from 'src/plugins/expressions/public';
import { Query } from 'src/legacy/core_plugins/data/public';
import { TimeRange } from 'src/plugins/data/public';
import { VisParams } from 'ui/vis';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { TimelionSetupDependencies } from '../plugin';

interface Stats {
  cacheCount: number;
  invokeTime: number;
  queryCount: number;
  queryTime: number;
  sheetTime: number;
}

interface Sheet {
  list: Array<Record<string, unknown>>;
  render: Record<string, unknown>;
  type: string;
}

export interface TimelionSuccessResponse {
  sheet: Sheet[];
  stats: Stats;
  visType: string;
  type: KIBANA_CONTEXT_NAME;
}

const { http } = npSetup.core;

export function getTimelionRequestHandler(dependencies: TimelionSetupDependencies) {
  const { config } = dependencies;
  const timezone = timezoneProvider(config)();

  return ({
    timeRange,
    filters,
    query,
    visParams,
  }: {
    timeRange: TimeRange;
    filters: Filter[];
    query: Query;
    visParams: VisParams;
    forceFetch?: boolean;
  }) => {
    return new Promise(async (resolve, reject) => {
      const expression = visParams.expression;

      if (!expression) return;

      const esQueryConfigs = getEsQueryConfig(config);

      try {
        const data = await http.post('../api/timelion/run', {
          body: JSON.stringify({
            sheet: [expression],
            extended: {
              es: {
                filter: buildEsQuery(undefined, query, filters, esQueryConfigs),
              },
            },
            time: { ...timeRange, interval: visParams.interval, timezone },
          }),
        });

        resolve(data);
      } catch (e) {
        const err = new Error(e.data.message);

        err.stack = e.data.stack;

        toastNotifications.addError(err, {
          title: i18n.translate('timelion.requestHandlerErrorTitle', {
            defaultMessage: 'Timelion request error',
          }),
        });

        reject(err);
      }
    });
  };
}
