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

import { i18n } from '@kbn/i18n';
import type { UnwrapPromise } from '@kbn/utility-types';
import type { ServerStatus, StatusResponse } from '../../../../types/status';
import type { HttpSetup } from '../../../http';
import type { NotificationsSetup } from '../../../notifications';
import type { DataType } from '../lib';

export interface Metric {
  name: string;
  value: number | number[];
  type?: DataType;
}

export interface FormattedStatus {
  id: string;
  state: {
    id: string;
    title: string;
    message: string;
    uiColor: string;
  };
}

/**
 * Returns an object of any keys that should be included for metrics.
 */
function formatMetrics({ metrics }: StatusResponse): Metric[] {
  if (!metrics) {
    return [];
  }

  return [
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.heapTotalHeader', {
        defaultMessage: 'Heap total',
      }),
      value: metrics.process.memory.heap.size_limit,
      type: 'byte',
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.heapUsedHeader', {
        defaultMessage: 'Heap used',
      }),
      value: metrics.process.memory.heap.used_in_bytes,
      type: 'byte',
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.loadHeader', {
        defaultMessage: 'Load',
      }),
      value: [metrics.os.load['1m'], metrics.os.load['5m'], metrics.os.load['15m']],
      type: 'time',
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.resTimeAvgHeader', {
        defaultMessage: 'Response time avg',
      }),
      value: metrics.response_times.avg_in_millis,
      type: 'time',
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.resTimeMaxHeader', {
        defaultMessage: 'Response time max',
      }),
      value: metrics.response_times.max_in_millis,
      type: 'time',
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.requestsPerSecHeader', {
        defaultMessage: 'Requests per second',
      }),
      value: (metrics.requests.total * 1000) / metrics.collection_interval_in_millis,
      type: 'float',
    },
  ];
}

/**
 * Reformat the backend data to make the frontend views simpler.
 */
function formatStatus(status: ServerStatus): FormattedStatus {
  return {
    id: status.id,
    state: {
      id: status.state,
      title: status.title,
      message: status.message,
      uiColor: status.uiColor,
    },
  };
}

/**
 * Get the status from the server API and format it for display.
 */
export async function loadStatus({
  http,
  notifications,
}: {
  http: HttpSetup;
  notifications: NotificationsSetup;
}) {
  let response: StatusResponse;

  try {
    response = await http.get('/api/status');
  } catch (e) {
    if ((e.response?.status ?? 0) >= 400) {
      notifications.toasts.addDanger(
        i18n.translate('core.statusPage.loadStatus.serverStatusCodeErrorMessage', {
          defaultMessage: 'Failed to request server status with status code {responseStatus}',
          values: { responseStatus: e.response?.status },
        })
      );
    } else {
      notifications.toasts.addDanger(
        i18n.translate('core.statusPage.loadStatus.serverIsDownErrorMessage', {
          defaultMessage: 'Failed to request server status. Perhaps your server is down?',
        })
      );
    }
    throw e;
  }

  return {
    name: response.name,
    version: response.version,
    statuses: response.status.statuses.map(formatStatus),
    serverState: formatStatus(response.status.overall).state,
    metrics: formatMetrics(response),
  };
}

export type ProcessedServerResponse = UnwrapPromise<ReturnType<typeof loadStatus>>;
