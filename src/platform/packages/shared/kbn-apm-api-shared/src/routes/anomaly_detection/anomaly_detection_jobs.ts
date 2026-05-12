/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ApmMlJob } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface AnomalyDetectionJobsResponse {
  jobs: ApmMlJob[];
  hasLegacyJobs: boolean;
}

export const anomalyDetectionJobsRoute = defineRoute<AnomalyDetectionJobsResponse>()({
  endpoint: 'GET /internal/apm/settings/anomaly-detection/jobs',
});
