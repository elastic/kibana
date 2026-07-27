/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-server';

/**
 * The event-based telemetry reporting API.
 * @see {@link AnalyticsServiceStart}
 * @public
 */
export type IAnalytics = AnalyticsServiceStart;

/**
 * The event-based telemetry reporting service.
 * @see {@link IAnalytics}
 * @public
 */
export const Analytics = Symbol('Analytics') as ServiceIdentifier<IAnalytics>;
