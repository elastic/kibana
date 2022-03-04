/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { service } from './service';
import { browser } from './browser';
import { getTransactionMetrics } from './utils/get_transaction_metrics';
import { getSpanDestinationMetrics } from './utils/get_span_destination_metrics';
import { getObserverDefaults } from './defaults/get_observer_defaults';
import { getChromeUserAgentDefaults } from './defaults/get_chrome_user_agent_defaults';
import { apmEventsToElasticsearchOutput } from './utils/apm_events_to_elasticsearch_output';
import { getBreakdownMetrics } from './utils/get_breakdown_metrics';
import { getApmWriteTargets } from './utils/get_apm_write_targets';
import { ApmSynthtraceEsClient } from './client/apm_synthtrace_es_client';

import type { ApmException } from './apm_fields';

export const apm = {
  service,
  browser,
  getTransactionMetrics,
  getSpanDestinationMetrics,
  getObserverDefaults,
  getChromeUserAgentDefaults,
  apmEventsToElasticsearchOutput,
  getBreakdownMetrics,
  getApmWriteTargets,
  ApmSynthtraceEsClient,
};

export type { ApmSynthtraceEsClient, ApmException };
