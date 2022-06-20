/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import ApmClient from './apm_client';
import CiStatsClient from './ci_stats_client';

interface ReporterOptions {
  param: {
    ciBuildId: string;
  };
  apmClient: {
    baseURL: string;
    username: string;
    password: string;
  };
  ciStatsClient: {
    baseURL: string;
    username: string;
    password: string;
  };
  log: ToolingLog;
}

export async function reporter(options: ReporterOptions) {
  const {
    param: { ciBuildId },
    apmClient: apmClientOptions,
    ciStatsClient: ciStatsClientOptions,
    log,
  } = options;

  const apm = new ApmClient(apmClientOptions, log);
  const ciStats = new CiStatsClient(ciStatsClientOptions, log);

  const performanceMainStats = await apm.mainStatistics({ ciBuildId });

  if (performanceMainStats) {
    const { transactionGroups: tg } = performanceMainStats;

    const loginStats = tg.find((e) => e.name === '/login');
    const appHomeStats = tg.find((e) => e.name === '/app/home');
    const appDashboardsStats = tg.find((e) => e.name === '/app/dashboards');

    await ciStats.postPerformanceMetricsReports(ciBuildId, 'url', {
      ...(loginStats && { page_load_login: loginStats.latency }),
      ...(appHomeStats && { page_load_app_home: appHomeStats.latency }),
      ...(appDashboardsStats && { page_load_app_dashboards: appDashboardsStats.latency }),
    });
  }
}
