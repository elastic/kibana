/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

// Model IDs that ship with Elasticsearch and must not be deleted during cleanup
const INTERNAL_MODEL_IDS = ['lang_ident_model_1'];
const ML_INTERNAL_HEADERS = { [ELASTIC_HTTP_VERSION_HEADER]: '1' } as const;

export interface DeleteJobsOptions {
  jobIds: string[];
  deleteUserAnnotations?: boolean;
  deleteAlertingRules?: boolean;
}

export interface MlJobsApi {
  delete: (options: DeleteJobsOptions) => Promise<void>;
}

export interface MlSavedObjectsApi {
  init: (simulate?: boolean, space?: string) => Promise<void>;
  sync: (simulate?: boolean, space?: string) => Promise<void>;
}

export interface MlIndicesApi {
  clean: () => Promise<void>;
}

export interface MlApiService {
  jobs: MlJobsApi;
  savedObjects: MlSavedObjectsApi;
  indices: MlIndicesApi;
}

export const getMlApiHelper = (
  log: ScoutLogger,
  kbnClient: KbnClient,
  esClient: EsClient
): MlApiService => {
  const savedObjects: MlSavedObjectsApi = {
    async init(simulate = false, space?: string) {
      const path = `${
        space ? `/s/${space}` : ''
      }/internal/ml/saved_objects/initialize?simulate=${simulate}`;
      await kbnClient.request({
        method: 'GET',
        path,
        headers: ML_INTERNAL_HEADERS,
      });
    },

    async sync(simulate = false, space?: string) {
      const path = `${space ? `/s/${space}` : ''}/api/ml/saved_objects/sync?simulate=${simulate}`;
      await kbnClient.request({
        method: 'GET',
        path,
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31' },
      });
    },
  };

  const jobs: MlJobsApi = {
    delete: async ({
      jobIds,
      deleteUserAnnotations = false,
      deleteAlertingRules = false,
    }: DeleteJobsOptions) => {
      await measurePerformanceAsync(log, `mlApi.jobs.delete [${jobIds.join(', ')}]`, async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/internal/ml/jobs/delete_jobs',
          headers: ML_INTERNAL_HEADERS,
          body: {
            jobIds,
            deleteUserAnnotations,
            deleteAlertingRules,
          },
        });
      });
    },
  };

  const indices: MlIndicesApi = {
    async clean() {
      await measurePerformanceAsync(log, 'mlApi.indices.clean', async () => {
        const { jobs: adJobs } = await esClient.ml.getJobs({ job_id: '_all' });
        for (const job of adJobs) {
          await esClient.ml
            .deleteJob({ job_id: job.job_id, force: true, wait_for_completion: true })
            .catch(() => {
              /* ignore errors */
            });
        }

        const { data_frame_analytics: dfaJobs } = await esClient.ml.getDataFrameAnalytics({
          id: '_all',
          allow_no_match: true,
        });
        for (const job of dfaJobs) {
          await esClient.ml.stopDataFrameAnalytics({ id: job.id, force: true }).catch(() => {
            /* ignore errors */
          });
          await esClient.ml.deleteDataFrameAnalytics({ id: job.id }).catch(() => {
            /* ignore errors */
          });
        }

        const { trained_model_configs: models } = await esClient.ml.getTrainedModels({
          size: 1000,
        });
        for (const model of models) {
          if (INTERNAL_MODEL_IDS.includes(model.model_id)) {
            continue;
          }
          await esClient.ml
            .deleteTrainedModel({ model_id: model.model_id, force: true })
            .catch(() => {
              /* ignore errors */
            });
        }

        await savedObjects.sync();
      });
    },
  };

  return {
    jobs,
    savedObjects,
    indices,
  };
};
