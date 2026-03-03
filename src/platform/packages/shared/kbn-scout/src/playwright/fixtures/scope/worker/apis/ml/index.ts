/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

export interface DeleteJobsOptions {
  jobIds: string[];
  deleteUserAnnotations?: boolean;
  deleteAlertingRules?: boolean;
}

export interface MlApiService {
  deleteJobs: (options: DeleteJobsOptions) => Promise<void>;
}

export const getMlApiHelper = (log: ScoutLogger, kbnClient: KbnClient): MlApiService => {
  return {
    deleteJobs: async ({
      jobIds,
      deleteUserAnnotations = false,
      deleteAlertingRules = false,
    }: DeleteJobsOptions) => {
      await measurePerformanceAsync(log, `mlApi.deleteJobs [${jobIds.join(', ')}]`, async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/internal/ml/jobs/delete_jobs',
          headers: {
            [ELASTIC_HTTP_VERSION_HEADER]: '1',
          },
          body: {
            jobIds,
            deleteUserAnnotations,
            deleteAlertingRules,
          },
        });
      });
    },
  };
};
