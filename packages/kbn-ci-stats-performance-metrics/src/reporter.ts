/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';

import { ApmClient } from './apm_client';

interface ReporterOptions {
  param: {
    ciBuildId: string;
  };
  apmClient: {
    baseURL: string;
    auth: {
      username: string;
      password: string;
    };
  };
  log: ToolingLog;
}

export async function reporter(options: ReporterOptions) {
  const {
    param: { ciBuildId },
    apmClient: apmClientOptions,
    log,
  } = options;

  const apm = new ApmClient(apmClientOptions, log);

  const performanceMainStats = await apm.mainStatistics({ ciBuildId });

  if (performanceMainStats) {
    const { transactionGroups: tg } = performanceMainStats;

    const loginStats = tg.find((e) => e.name === '/login');
    const appHomeStats = tg.find((e) => e.name === '/app/home');
    const appDashboardsStats = tg.find((e) => e.name === '/app/dashboards');

    const ciStatsReporter = CiStatsReporter.fromEnv(log);

    const body = {
      ...(loginStats && { page_load_login: loginStats.latency }),
      ...(appHomeStats && { page_load_app_home: appHomeStats.latency }),
      ...(appDashboardsStats && { page_load_app_dashboards: appDashboardsStats.latency }),
    };

    await ciStatsReporter.reportPerformanceMetrics(body);
  }
}
