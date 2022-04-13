/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { service } from './service';
import { browser } from './browser';
import { getTransactionMetrics } from './processors/get_transaction_metrics';
import { getSpanDestinationMetrics } from './processors/get_span_destination_metrics';
import { getChromeUserAgentDefaults } from './defaults/get_chrome_user_agent_defaults';
import { getBreakdownMetrics } from './processors/get_breakdown_metrics';
import { getApmWriteTargets } from './utils/get_apm_write_targets';
import { ApmSynthtraceEsClient } from './client/apm_synthtrace_es_client';

import type { ApmException } from './apm_fields';

export const apm = {
  service,
  browser,
  getTransactionMetrics,
  getSpanDestinationMetrics,
  getChromeUserAgentDefaults,
  getBreakdownMetrics,
  getApmWriteTargets,
  ApmSynthtraceEsClient,
};

export type { ApmSynthtraceEsClient, ApmException };
