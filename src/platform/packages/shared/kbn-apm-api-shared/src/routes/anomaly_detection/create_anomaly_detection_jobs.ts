/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentStringRt } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface CreateAnomalyDetectionJobsResponse {
  jobCreated: true;
}

export const createAnomalyDetectionJobsRoute = defineRoute<CreateAnomalyDetectionJobsResponse>()({
  endpoint: 'POST /internal/apm/settings/anomaly-detection/jobs',
  params: t.type({
    body: t.type({
      environments: t.array(environmentStringRt),
    }),
  }),
});
