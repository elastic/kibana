/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';

export const LOGS_EXPERIENCE_TAGS = [...tags.stateful.all, ...tags.serverless.observability.all];

export const LOGS = {
  // Fixed rather than moment-relative: global setup seeds this range once, and each worker
  // sets it as the default time, so both must resolve to the same window.
  DEFAULT_START_TIME: '2025-01-01T00:00:00.000Z',
  DEFAULT_END_TIME: '2025-01-01T01:00:00.000Z',

  ALL_LOGS_DATA_VIEW: 'All logs',
  METRICS_DATA_VIEW: 'metrics-system*',

  SYNTH_LOGS_DATASET: 'synth.recommended',
  SYNTH_LOGS_NAMESPACE: 'default',
  SYNTH_METRICS_HOST: 'synth-metrics-host-01',
} as const;
