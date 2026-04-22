/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as EsClient, estypes } from '@elastic/elasticsearch';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

// Model IDs that ship with Elasticsearch and must not be deleted during cleanup
const INTERNAL_MODEL_IDS = ['lang_ident_model_1'];
const ML_INTERNAL_HEADERS = { [ELASTIC_HTTP_VERSION_HEADER]: '1' } as const;

interface MlFilter {
  filter_id: string;
  description?: string;
  items: string[];
}

export interface DeleteJobsOptions {
  jobIds: string[];
  deleteUserAnnotations?: boolean;
  deleteAlertingRules?: boolean;
}

export interface MlJobsApi {
  delete: (options: DeleteJobsOptions) => Promise<void>;
  getAllJobs: () => Promise<estypes.MlJob[]>;
  deleteAllJobs: () => Promise<void>;
  deleteExpiredData: () => Promise<void>;
}

export interface MlCalendarsApi {
  getAllCalendars: () => Promise<estypes.MlGetCalendarsCalendar[]>;
  deleteCalendar: (calendarId: string) => Promise<void>;
  deleteAllCalendars: () => Promise<void>;
}

export interface MlFiltersApi {
  getAllFilters: () => Promise<MlFilter[]>;
  getFilter: (filterId: string) => Promise<estypes.MlFilter | null>;
  deleteFilter: (filterId: string) => Promise<void>;
  deleteAllFilters: () => Promise<void>;
}

export interface MlAnnotationsApi {
  getAll: () => Promise<Array<{ _id: string; _source: Record<string, unknown> }>>;
  delete: (annotationId: string) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export interface MlDataFrameAnalyticsApi {
  getAllJobs: () => Promise<estypes.MlDataframeAnalyticsSummary[]>;
  deleteAllJobs: () => Promise<void>;
}

export interface MlTrainedModelsApi {
  getAll: () => Promise<estypes.MlTrainedModelConfig[]>;
  deleteAll: () => Promise<void>;
}

export interface MlIngestPipelinesApi {
  deleteAll: () => Promise<void>;
}

export interface MlSavedObjectsApi {
  init: (simulate?: boolean, space?: string) => Promise<void>;
  sync: (simulate?: boolean, space?: string) => Promise<void>;
}

export interface MlIndicesApi {
  cleanAnomalyDetection: () => Promise<void>;
  cleanDataFrameAnalytics: () => Promise<void>;
  cleanTrainedModels: () => Promise<void>;
  cleanAll: () => Promise<void>;
}

export interface MlApiService {
  jobs: MlJobsApi;
  calendars: MlCalendarsApi;
  filters: MlFiltersApi;
  annotations: MlAnnotationsApi;
  dataFrameAnalytics: MlDataFrameAnalyticsApi;
  trainedModels: MlTrainedModelsApi;
  ingestPipelines: MlIngestPipelinesApi;
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

    async getAllJobs(): Promise<estypes.MlJob[]> {
      return measurePerformanceAsync(log, 'mlApi.anomalyDetection.getAllJobs', async () => {
        const { jobs: adJobs } = await esClient.ml.getJobs({ job_id: '_all' });
        return adJobs;
      });
    },

    async deleteAllJobs(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.anomalyDetection.deleteAllJobs', async () => {
        const adJobs = await this.getAllJobs();
        for (const job of adJobs) {
          await esClient.ml
            .deleteJob({ job_id: job.job_id, force: true, wait_for_completion: true })
            .catch(() => {
              /* ignore errors */
            });
        }
      });
    },

    async deleteExpiredData(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.deleteExpiredData', async () => {
        await esClient.transport.request({
          method: 'DELETE',
          path: '/_ml/_delete_expired_data',
        });
      });
    },
  };

  const calendars: MlCalendarsApi = {
    async getAllCalendars(): Promise<estypes.MlGetCalendarsCalendar[]> {
      return measurePerformanceAsync(log, 'mlApi.getAllCalendars', async () => {
        const response = await esClient.ml.getCalendars();
        return response.calendars || [];
      });
    },

    async deleteCalendar(calendarId: string): Promise<void> {
      await measurePerformanceAsync(log, `mlApi.deleteCalendar [${calendarId}]`, async () => {
        const response = await esClient.ml.deleteCalendar({ calendar_id: calendarId });
        if (response.acknowledged !== true) {
          throw new Error(`Failed to delete calendar ${calendarId}`);
        }
      });
    },

    async deleteAllCalendars(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.deleteAllCalendars', async () => {
        const allCalendars = await this.getAllCalendars();
        for (const calendar of allCalendars) {
          await this.deleteCalendar(calendar.calendar_id).catch(() => {
            /* ignore errors */
          });
        }
      });
    },
  };

  const filters: MlFiltersApi = {
    async getAllFilters() {
      return measurePerformanceAsync(log, 'mlApi.getAllFilters', async () => {
        const response = await esClient.ml.getFilters();
        return response.filters || [];
      });
    },

    async getFilter(filterId: string): Promise<estypes.MlFilter | null> {
      return measurePerformanceAsync(log, `mlApi.getFilter [${filterId}]`, async () => {
        const response = await esClient.ml.getFilters({ filter_id: filterId });
        return response.filters?.[0] || null;
      });
    },

    async deleteFilter(filterId: string): Promise<void> {
      await measurePerformanceAsync(log, `mlApi.deleteFilter [${filterId}]`, async () => {
        const existing = await this.getFilter(filterId);
        if (!existing) return;

        const response = await esClient.ml.deleteFilter({ filter_id: filterId });
        if (response.acknowledged !== true) {
          throw new Error(`Failed to delete filter ${filterId}`);
        }
      });
    },

    async deleteAllFilters(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.deleteAllFilters', async () => {
        const allFilters = await this.getAllFilters();
        for (const filter of allFilters) {
          await this.deleteFilter(filter.filter_id).catch(() => {
            /* ignore errors */
          });
        }
      });
    },
  };

  const annotations: MlAnnotationsApi = {
    async getAll(): Promise<Array<{ _id: string; _source: Record<string, unknown> }>> {
      return measurePerformanceAsync(log, 'mlApi.annotations.getAll', async () => {
        try {
          const annotationsResp = await esClient.search({
            index: '.ml-annotations*',
            size: 10000,
          });
          return annotationsResp.hits.hits
            .filter((hit): hit is typeof hit & { _id: string } => hit._id !== undefined)
            .map((hit) => ({
              _id: hit._id,
              _source: hit._source as Record<string, unknown>,
            }));
        } catch {
          return [];
        }
      });
    },

    async delete(annotationId: string): Promise<void> {
      await measurePerformanceAsync(log, `mlApi.annotations.delete [${annotationId}]`, async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `/internal/ml/annotations/delete/${annotationId}`,
          headers: ML_INTERNAL_HEADERS,
        });
      });
    },

    async deleteAll(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.annotations.deleteAll', async () => {
        const allAnnotations = await this.getAll();
        for (const annotation of allAnnotations) {
          await this.delete(annotation._id).catch(() => {
            /* ignore errors */
          });
        }
      });
    },
  };

  const dataFrameAnalytics: MlDataFrameAnalyticsApi = {
    async getAllJobs(): Promise<estypes.MlDataframeAnalyticsSummary[]> {
      return measurePerformanceAsync(log, 'mlApi.dataFrameAnalytics.getAllJobs', async () => {
        const { data_frame_analytics: dfaJobs } = await esClient.ml.getDataFrameAnalytics({
          id: '_all',
          allow_no_match: true,
        });
        return dfaJobs;
      });
    },

    async deleteAllJobs(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.dataFrameAnalytics.deleteAllJobs', async () => {
        const dfaJobs = await this.getAllJobs();
        for (const job of dfaJobs) {
          try {
            await esClient.ml.stopDataFrameAnalytics({ id: job.id, force: true });
          } catch {
            /* ignore errors */
          }
          try {
            await esClient.ml.deleteDataFrameAnalytics({ id: job.id });
          } catch {
            /* ignore errors */
          }
        }
      });
    },
  };

  const trainedModels: MlTrainedModelsApi = {
    async getAll(): Promise<estypes.MlTrainedModelConfig[]> {
      return measurePerformanceAsync(log, 'mlApi.trainedModels.getAll', async () => {
        const { trained_model_configs: models } = await esClient.ml.getTrainedModels({
          size: 1000,
        });
        return models;
      });
    },

    async deleteAll(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.trainedModels.deleteAll', async () => {
        const models = await this.getAll();
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
      });
    },
  };

  const ingestPipelines: MlIngestPipelinesApi = {
    async deleteAll(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.ingestPipelines.deleteAll', async () => {
        const models = await trainedModels.getAll();

        for (const model of models) {
          if (INTERNAL_MODEL_IDS.includes(model.model_id)) {
            continue;
          }

          await esClient.ingest.deletePipeline({ id: model.model_id }).catch(() => {
            /* ignore errors */
          });
        }
      });
    },
  };

  const indices: MlIndicesApi = {
    async cleanAnomalyDetection() {
      await measurePerformanceAsync(log, 'mlApi.indices.cleanAnomalyDetection', async () => {
        await jobs.deleteAllJobs();
        await calendars.deleteAllCalendars();
        await filters.deleteAllFilters();
        await annotations.deleteAll();
        await jobs.deleteExpiredData();
        await savedObjects.sync();
      });
    },

    async cleanDataFrameAnalytics() {
      await measurePerformanceAsync(log, 'mlApi.indices.cleanDataFrameAnalytics', async () => {
        await dataFrameAnalytics.deleteAllJobs();
        await savedObjects.sync();
      });
    },

    async cleanTrainedModels() {
      await measurePerformanceAsync(log, 'mlApi.indices.cleanTrainedModels', async () => {
        await ingestPipelines.deleteAll();
        await trainedModels.deleteAll();
        await savedObjects.sync();
      });
    },

    async cleanAll() {
      await measurePerformanceAsync(log, 'mlApi.indices.cleanAll', async () => {
        await this.cleanAnomalyDetection();
        await this.cleanDataFrameAnalytics();
        await this.cleanTrainedModels();
      });
    },
  };

  return {
    jobs,
    calendars,
    filters,
    annotations,
    dataFrameAnalytics,
    trainedModels,
    ingestPipelines,
    savedObjects,
    indices,
  };
};
