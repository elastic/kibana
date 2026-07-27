/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * The event-based telemetry reporting API.
 * @see {@link AnalyticsServiceSetup}
 * @public
 */
export type IAnalytics = Pick<AnalyticsServiceSetup, 'optIn' | 'reportEvent' | 'telemetryCounter$'>;

/**
 * The event-based telemetry reporting service.
 * @see {@link IAnalytics}
 * @public
 */
export const Analytics: ServiceToken<IAnalytics> = createToken('Analytics');
