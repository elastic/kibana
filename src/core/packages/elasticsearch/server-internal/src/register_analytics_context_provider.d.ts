/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { ClusterInfo } from './get_cluster_info';
/**
 * Registers the Analytics context provider to enrich events with the cluster info.
 * @param analytics Analytics service.
 * @param context$ Observable emitting the cluster info.
 * @internal
 */
export declare function registerAnalyticsContextProvider(
  analytics: AnalyticsServiceSetup,
  context$: Observable<ClusterInfo>
): void;
