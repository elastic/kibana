/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { service } from './service';
import { mobileApp } from './mobile_app';
import { browser } from './browser';
import { serverlessFunction } from './serverless_function';
import { getChromeUserAgentDefaults } from './defaults/get_chrome_user_agent_defaults';
import { getBreakdownMetrics } from './processors/get_breakdown_metrics';
import { ApmSynthtraceEsClient } from './client/apm_synthtrace_es_client';
import { ApmSynthtraceKibanaClient } from './client/apm_synthtrace_kibana_client';

import type { ApmException } from './apm_fields';

export const apm = {
  service,
  mobileApp,
  browser,
  getChromeUserAgentDefaults,
  getBreakdownMetrics,
  serverlessFunction,
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
};

export type { ApmException };

export type { ApmSynthtraceEsClient, ApmSynthtraceKibanaClient };
