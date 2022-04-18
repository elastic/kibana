/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { StatusResponse, ServiceStatus, ServiceStatusLevel } from '../../../../types/status';
import type { HttpSetup } from '../../../http';
import type { NotificationsSetup } from '../../../notifications';
import type { DataType } from '.';

interface MetricMeta {
  title: string;
  description: string;
  value?: number[];
  type?: DataType;
}
export interface Metric {
  name: string;
  value: number | number[];
  type?: DataType;
  meta?: MetricMeta;
}

export interface FormattedStatus {
  id: string;
  state: StatusState;
  original: ServiceStatus;
}

export interface StatusState {
  id: ServiceStatusLevel;
  title: string;
  message: string;
  uiColor: string;
}

interface StatusUIAttributes {
  title: string;
  uiColor: string;
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
      name: i18n.translate('core.statusPage.metricsTiles.columns.requestsPerSecHeader', {
        defaultMessage: 'Requests per second',
      }),
      value: (metrics.requests.total * 1000) / metrics.collection_interval_in_millis,
      type: 'float',
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.loadHeader', {
        defaultMessage: 'Load',
      }),
      value: [metrics.os.load['1m'], metrics.os.load['5m'], metrics.os.load['15m']],
      type: 'float',
      meta: {
        description: i18n.translate('core.statusPage.metricsTiles.columns.load.metaHeader', {
          defaultMessage: 'Load interval',
        }),
        title: Object.keys(metrics.os.load).join('; '),
      },
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.processDelayHeader', {
        defaultMessage: 'Delay',
      }),
      value: metrics.process.event_loop_delay,
      type: 'time',
      meta: {
        description: i18n.translate(
          'core.statusPage.metricsTiles.columns.processDelayDetailsHeader',
          {
            defaultMessage: 'Percentiles',
          }
        ),
        title: '',
        value: [
          metrics.process.event_loop_delay_histogram?.percentiles['50'],
          metrics.process.event_loop_delay_histogram?.percentiles['95'],
          metrics.process.event_loop_delay_histogram?.percentiles['99'],
        ],
        type: 'time',
      },
    },
    {
      name: i18n.translate('core.statusPage.metricsTiles.columns.resTimeAvgHeader', {
        defaultMessage: 'Response time avg',
      }),
      value: metrics.response_times.avg_in_millis,
      type: 'time',
      meta: {
        description: i18n.translate('core.statusPage.metricsTiles.columns.resTimeMaxHeader', {
          defaultMessage: 'Response time max',
        }),
        title: '',
        value: [metrics.response_times.max_in_millis],
        type: 'time',
      },
    },
  ];
}

/**
 * Reformat the backend data to make the frontend views simpler.
 */
function formatStatus(id: string, status: ServiceStatus): FormattedStatus {
  const { title, uiColor } = STATUS_LEVEL_UI_ATTRS[status.level];

  return {
    id,
    original: status,
    state: {
      id: status.level,
      message: status.summary,
      title,
      uiColor,
    },
  };
}

export const STATUS_LEVEL_UI_ATTRS: Record<ServiceStatusLevel, StatusUIAttributes> = {
  critical: {
    title: i18n.translate('core.status.redTitle', {
      defaultMessage: 'Red',
    }),
    uiColor: 'danger',
  },
  unavailable: {
    title: i18n.translate('core.status.redTitle', {
      defaultMessage: 'Red',
    }),
    uiColor: 'danger',
  },
  degraded: {
    title: i18n.translate('core.status.yellowTitle', {
      defaultMessage: 'Yellow',
    }),
    uiColor: 'warning',
  },
  available: {
    title: i18n.translate('core.status.greenTitle', {
      defaultMessage: 'Green',
    }),
    uiColor: 'success',
  },
};

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
    // API returns a 503 response if not all services are available.
    // In this case, we want to treat this as a successful API call, so that we can
    // display Kibana's status correctly.
    // 503 responses can happen for other reasons (such as proxies), so we make an educated
    // guess here to determine if the response payload looks like an appropriate `StatusResponse`.
    const ignoreError = e.response?.status === 503 && typeof e.body?.name === 'string';

    if (ignoreError) {
      response = e.body;
    } else {
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
  }

  return {
    name: response.name,
    version: response.version,
    coreStatus: Object.entries(response.status.core).map(([serviceName, status]) =>
      formatStatus(serviceName, status)
    ),
    pluginStatus: Object.entries(response.status.plugins).map(([pluginName, status]) =>
      formatStatus(pluginName, status)
    ),

    serverState: formatStatus('overall', response.status.overall).state,
    metrics: formatMetrics(response),
  };
}

export type ProcessedServerResponse = Awaited<ReturnType<typeof loadStatus>>;
