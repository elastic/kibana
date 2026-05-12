/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { anomalyDetectionJobsRoute } from './anomaly_detection_jobs';
import { createAnomalyDetectionJobsRoute } from './create_anomaly_detection_jobs';
import { anomalyDetectionEnvironmentsRoute } from './anomaly_detection_environments';
import { anomalyDetectionUpdateToV3Route } from './anomaly_detection_update_to_v3';

export const anomalyDetectionRouteDefinitions = {
  jobs: anomalyDetectionJobsRoute,
  createJobs: createAnomalyDetectionJobsRoute,
  environments: anomalyDetectionEnvironmentsRoute,
  updateToV3: anomalyDetectionUpdateToV3Route,
};

export type { AnomalyDetectionJobsResponse } from './anomaly_detection_jobs';
export type { CreateAnomalyDetectionJobsResponse } from './create_anomaly_detection_jobs';
export type { AnomalyDetectionEnvironmentsResponse } from './anomaly_detection_environments';
export type { AnomalyDetectionUpdateToV3Response } from './anomaly_detection_update_to_v3';
