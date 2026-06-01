/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';

export const TIMEPICKER_FALLBACK: Readonly<TimeRange> = {
  from: 'now-15m',
  to: 'now',
};

export const ENABLED_TRIGGER_TABS = ['alert', 'index', 'event', 'manual', 'historical'] as const;
export const ENABLED_STEP_TRIGGER_TABS = ['manual', 'historical'] as const;
