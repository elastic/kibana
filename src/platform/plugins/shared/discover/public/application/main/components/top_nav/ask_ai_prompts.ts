/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const ASK_AI_SUGGESTED_PROMPTS: readonly string[] = [
  i18n.translate('discover.topNav.askAi.promptCpuUsageByHost', {
    defaultMessage: 'Track CPU usage by host',
  }),
  i18n.translate('discover.topNav.askAi.promptAnomaliesInTraces', {
    defaultMessage: 'Detect spikes, dips, or anomalies in my traces',
  }),
  i18n.translate('discover.topNav.askAi.promptErrorsLastHour', {
    defaultMessage: 'Find errors in the last hour',
  }),
  i18n.translate('discover.topNav.askAi.promptServicesByLatency', {
    defaultMessage: 'Rank services by p95 latency',
  }),
];
