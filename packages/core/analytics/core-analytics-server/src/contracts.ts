/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClient } from '@elastic/ebt/client';

/**
 * Exposes the public APIs of the AnalyticsClient during the preboot phase
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServicePreboot = Omit<AnalyticsClient, 'flush' | 'shutdown'>;

/**
 * Exposes the public APIs of the AnalyticsClient during the setup phase.
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServiceSetup = Omit<AnalyticsClient, 'flush' | 'shutdown'>;

/**
 * Exposes the public APIs of the AnalyticsClient during the start phase
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServiceStart = Pick<
  AnalyticsClient,
  'optIn' | 'reportEvent' | 'telemetryCounter$'
>;
