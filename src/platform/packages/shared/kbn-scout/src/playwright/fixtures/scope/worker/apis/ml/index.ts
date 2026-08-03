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
const ML_ANNOTATIONS_INDEX_ALIAS_READ = '.ml-annotations-read';
const ML_INTERNAL_HEADERS = { [ELASTIC_HTTP_VERSION_HEADER]: '1' } as const;

export interface Annotation {
  timestamp: number;
  annotation: string;
  job_id: string;
  type: 'annotation' | 'comment';
}

export interface DeleteJobsOptions {
  jobIds: string[];
  deleteUserAnnotations?: boolean;
  deleteAlertingRules?: boolean;
}

export interface MlADJobsApi {
  /** Delete anomaly detection jobs via the Kibana API */
  delete: (options: DeleteJobsOptions) => Promise<void>;
  /** Get all anomaly detection jobs via the Elasticsearch API */
  getAllJobs: () => Promise<estypes.MlJob[]>;
  /** Wait for an anomaly detection job to exist by polling the Elasticsearch API */
  waitForJobToExist: (jobId: string, timeout?: number) => Promise<void>;
  /** Wait for an anomaly detection job to be deleted by polling the Elasticsearch API */
  waitForJobNotToExist: (jobId: string, timeout?: number) => Promise<void>;
  /** Delete all anomaly detection jobs via the Elasticsearch API */
  deleteAllJobs: () => Promise<void>;
  /** Delete expired ML data via the Elasticsearch API */
  deleteExpiredData: () => Promise<void>;
  calendars: MlCalendarsApi;
  filters: MlFiltersApi;
  annotations: MlAnnotationsApi;
}

export interface MlCalendarsApi {
  /** Get all ML calendars via the Elasticsearch API */
  getAll: () => Promise<estypes.MlGetCalendarsCalendar[]>;
  /** Wait for a calendar to exist by polling the Elasticsearch API */
  waitForCalendarToExist: (calendarId: string) => Promise<void>;
  /** Wait for a calendar to be deleted by polling the Elasticsearch API */
  waitForCalendarNotToExist: (calendarId: string) => Promise<void>;
  /** Delete a calendar via the Elasticsearch API */
  delete: (calendarId: string) => Promise<void>;
  /** Delete all calendars via the Elasticsearch API */
  deleteAll: () => Promise<void>;
}

export interface MlFiltersApi {
  /** Get all ML filters via the Elasticsearch API */
  getAll: () => Promise<estypes.MlFilter[]>;
  /** Get an ML filter by ID via the Elasticsearch API */
  getById: (filterId: string) => Promise<estypes.MlFilter | null>;
  /** Wait for a filter to exist by polling the Elasticsearch API */
  waitForFilterToExist: (filterId: string) => Promise<void>;
  /** Wait for a filter to be deleted by polling the Elasticsearch API */
  waitForFilterToNotExist: (filterId: string) => Promise<void>;
  /** Delete a filter via the Elasticsearch API */
  delete: (filterId: string) => Promise<void>;
  /** Delete all filters via the Elasticsearch API */
  deleteAll: () => Promise<void>;
}

export interface MlAnnotationsApi {
  /** Get all ML annotations by querying Elasticsearch directly */
  getAll: () => Promise<Array<{ _id: string; _source: Annotation }>>;
  /** Get an ML annotation by ID by querying Elasticsearch directly */
  getById: (annotationId: string) => Promise<{ _id: string; _source: Annotation } | undefined>;
  /** Wait for an annotation to exist by polling Elasticsearch directly */
  waitForAnnotationToExist: (annotationId: string) => Promise<void>;
  /** Wait for an annotation to be deleted by polling Elasticsearch directly */
  waitForAnnotationNotToExist: (annotationId: string) => Promise<void>;
  /** Delete an annotation via the Kibana API */
  delete: (annotationId: string) => Promise<void>;
  /** Delete all annotations via the Kibana API */
  deleteAll: () => Promise<void>;
}

export interface MlDataFrameAnalyticsApi {
  /** Get all data frame analytics jobs via the Elasticsearch API */
  getAllJobs: () => Promise<estypes.MlDataframeAnalyticsSummary[]>;
  /** Wait for a data frame analytics job to exist by polling the Elasticsearch API */
  waitForJobToExist: (analyticsId: string, timeout?: number) => Promise<void>;
  /** Wait for a data frame analytics job to be deleted by polling the Elasticsearch API */
  waitForJobNotToExist: (analyticsId: string, timeout?: number) => Promise<void>;
  /** Delete all data frame analytics jobs via the Elasticsearch API */
  deleteAllJobs: () => Promise<void>;
}

export interface MlTrainedModelsApi {
  /** Get all trained models via the Elasticsearch API */
  getAll: () => Promise<estypes.MlTrainedModelConfig[]>;
  /** Delete all trained models (excluding internal models) via the Elasticsearch API */
  deleteAll: () => Promise<void>;
}

export interface MlIngestPipelinesApi {
  /** Delete all ML-related ingest pipelines via the Elasticsearch API */
  deleteAll: () => Promise<void>;
}

export interface MlSavedObjectsApi {
  /** Initialize ML saved objects via the Kibana API */
  init: (simulate?: boolean, space?: string) => Promise<void>;
  /** Sync ML saved objects via the Kibana API */
  sync: (simulate?: boolean, space?: string) => Promise<void>;
}

export interface MlIndicesApi {
  /** Clean up all anomaly detection resources via Kibana and Elasticsearch APIs */
  cleanAnomalyDetection: () => Promise<void>;
  /** Clean up all data frame analytics resources via Kibana and Elasticsearch APIs */
  cleanDataFrameAnalytics: () => Promise<void>;
  /** Clean up all trained models and ingest pipelines via Kibana and Elasticsearch APIs */
  cleanTrainedModels: () => Promise<void>;
  /** Clean up all ML resources via Kibana and Elasticsearch APIs */
  cleanAll: () => Promise<void>;
}

export interface MlApiService {
  anomalyDetection: MlADJobsApi;
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
  const waitForCondition = async (
    conditionName: string,
    conditionFn: () => Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 200
  ): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    let lastError: Error | undefined;

    while (true) {
      try {
        if (await conditionFn()) return;
      } catch (err) {
        lastError = err as Error;
      }
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw lastError ?? new Error(`Timed out after ${timeoutMs}ms waiting for: ${conditionName}`);
  };

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

  const calendars: MlCalendarsApi = {
    async getAll(): Promise<estypes.MlGetCalendarsCalendar[]> {
      return measurePerformanceAsync(log, 'mlApi.calendars.getAll', async () => {
        const response = await esClient.ml.getCalendars();
        return response.calendars || [];
      });
    },

    async waitForCalendarToExist(calendarId: string): Promise<void> {
      await waitForCondition(`calendar '${calendarId}' to exist`, async () => {
        const allCalendars = await this.getAll();
        if (allCalendars.some((c) => c.calendar_id === calendarId)) return true;
        throw new Error(`Calendar '${calendarId}' does not exist`);
      });
    },

    async waitForCalendarNotToExist(calendarId: string): Promise<void> {
      await waitForCondition(`calendar '${calendarId}' to not exist`, async () => {
        const allCalendars = await this.getAll();
        if (!allCalendars.some((c) => c.calendar_id === calendarId)) return true;
        throw new Error(`Calendar '${calendarId}' still exists`);
      });
    },

    async delete(calendarId: string): Promise<void> {
      await measurePerformanceAsync(log, `mlApi.calendars.delete [${calendarId}]`, async () => {
        const response = await esClient.ml.deleteCalendar({ calendar_id: calendarId });
        if (response.acknowledged !== true) {
          throw new Error(`Failed to delete calendar ${calendarId}`);
        }
        await this.waitForCalendarNotToExist(calendarId);
      });
    },

    async deleteAll(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.calendars.deleteAll', async () => {
        const allCalendars = await this.getAll();
        for (const calendar of allCalendars) {
          await this.delete(calendar.calendar_id).catch(() => {
            /* ignore errors */
          });
        }
      });
    },
  };

  const filters: MlFiltersApi = {
    async getAll() {
      return measurePerformanceAsync(log, 'mlApi.filters.getAll', async () => {
        const response = await esClient.ml.getFilters();
        return response.filters || [];
      });
    },

    async getById(filterId: string): Promise<estypes.MlFilter | null> {
      return measurePerformanceAsync(log, `mlApi.filters.getById [${filterId}]`, async () => {
        try {
          const response = await esClient.ml.getFilters({ filter_id: filterId });
          return response.filters?.[0] ?? null;
        } catch {
          return null;
        }
      });
    },

    async waitForFilterToExist(filterId: string): Promise<void> {
      await waitForCondition(`filter '${filterId}' to exist`, async () => {
        if ((await this.getById(filterId)) !== null) return true;
        throw new Error(`Filter '${filterId}' does not exist`);
      });
    },

    async waitForFilterToNotExist(filterId: string): Promise<void> {
      await waitForCondition(`filter '${filterId}' to not exist`, async () => {
        if ((await this.getById(filterId)) === null) return true;
        throw new Error(`Filter '${filterId}' still exists`);
      });
    },

    async delete(filterId: string): Promise<void> {
      await measurePerformanceAsync(log, `mlApi.filters.delete [${filterId}]`, async () => {
        const existing = await this.getById(filterId);
        if (!existing) return;

        const response = await esClient.ml.deleteFilter({ filter_id: filterId });
        if (response.acknowledged !== true) {
          throw new Error(`Failed to delete filter ${filterId}`);
        }
        await this.waitForFilterToNotExist(filterId);
      });
    },

    async deleteAll(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.filters.deleteAll', async () => {
        const allFilters = await this.getAll();
        for (const filter of allFilters) {
          await this.delete(filter.filter_id).catch(() => {
            /* ignore errors */
          });
        }
      });
    },
  };

  const annotations: MlAnnotationsApi = {
    async getAll(): Promise<Array<{ _id: string; _source: Annotation }>> {
      return measurePerformanceAsync(log, 'mlApi.annotations.getAll', async () => {
        try {
          const annotationsResp = await esClient.search<Annotation>({
            index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
            size: 10000,
          });
          return annotationsResp.hits.hits
            .filter(
              (hit): hit is typeof hit & { _id: string; _source: Annotation } =>
                hit._id !== undefined && hit._source !== undefined
            )
            .map((hit) => ({
              _id: hit._id,
              _source: hit._source,
            }));
        } catch {
          return [];
        }
      });
    },

    async getById(annotationId: string): Promise<{ _id: string; _source: Annotation } | undefined> {
      return measurePerformanceAsync(
        log,
        `mlApi.annotations.getById [${annotationId}]`,
        async () => {
          try {
            const resp = await esClient.search<Annotation>({
              index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
              size: 1,
              query: { ids: { values: [annotationId] } },
            });
            const hit = resp.hits.hits[0];
            if (hit?._id === undefined || hit._source === undefined) return undefined;
            return { _id: hit._id, _source: hit._source };
          } catch {
            return undefined;
          }
        }
      );
    },

    async waitForAnnotationToExist(annotationId: string): Promise<void> {
      await waitForCondition(
        `annotation '${annotationId}' to exist`,
        async () => {
          if ((await this.getById(annotationId)) !== undefined) return true;
          throw new Error(`Annotation '${annotationId}' does not exist`);
        },
        30 * 1000
      );
    },

    async waitForAnnotationNotToExist(annotationId: string): Promise<void> {
      await waitForCondition(
        `annotation '${annotationId}' to not exist`,
        async () => {
          if ((await this.getById(annotationId)) === undefined) return true;
          throw new Error(`Annotation '${annotationId}' still exists`);
        },
        30 * 1000
      );
    },

    async delete(annotationId: string): Promise<void> {
      await measurePerformanceAsync(log, `mlApi.annotations.delete [${annotationId}]`, async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `/internal/ml/annotations/delete/${annotationId}`,
          headers: ML_INTERNAL_HEADERS,
        });
        await this.waitForAnnotationNotToExist(annotationId);
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

  const anomalyDetection: MlADJobsApi = {
    async delete({
      jobIds,
      deleteUserAnnotations = false,
      deleteAlertingRules = false,
    }: DeleteJobsOptions): Promise<void> {
      await measurePerformanceAsync(
        log,
        `mlApi.anomalyDetection.delete [${jobIds.join(', ')}]`,
        async () => {
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
          for (const jobId of jobIds) {
            await this.waitForJobNotToExist(jobId);
          }
        }
      );
    },

    async getAllJobs(): Promise<estypes.MlJob[]> {
      return measurePerformanceAsync(log, 'mlApi.anomalyDetection.getAllJobs', async () => {
        const { jobs: adJobs } = await esClient.ml.getJobs({ job_id: '_all' });
        return adJobs;
      });
    },

    async waitForJobToExist(jobId: string, timeout = 5 * 1000): Promise<void> {
      await waitForCondition(
        `anomaly detection job '${jobId}' to exist`,
        async () => {
          const allJobs = await this.getAllJobs();
          if (allJobs.some((j) => j.job_id === jobId)) return true;
          throw new Error(`Anomaly detection job '${jobId}' does not exist`);
        },
        timeout
      );
    },

    async waitForJobNotToExist(jobId: string, timeout = 5 * 1000): Promise<void> {
      await waitForCondition(
        `anomaly detection job '${jobId}' to not exist`,
        async () => {
          const allJobs = await this.getAllJobs();
          if (!allJobs.some((j) => j.job_id === jobId)) return true;
          throw new Error(`Anomaly detection job '${jobId}' still exists`);
        },
        timeout
      );
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
      await measurePerformanceAsync(log, 'mlApi.anomalyDetection.deleteExpiredData', async () => {
        await esClient.transport.request({
          method: 'DELETE',
          path: '/_ml/_delete_expired_data',
        });
      });
    },

    calendars,
    filters,
    annotations,
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

    async waitForJobToExist(analyticsId: string, timeout = 5 * 1000): Promise<void> {
      await waitForCondition(
        `data frame analytics job '${analyticsId}' to exist`,
        async () => {
          const { data_frame_analytics: dfaJobs } = await esClient.ml.getDataFrameAnalytics({
            id: analyticsId,
            allow_no_match: true,
          });
          if (dfaJobs.length > 0) return true;
          throw new Error(`Data frame analytics job '${analyticsId}' does not exist`);
        },
        timeout
      );
    },

    async waitForJobNotToExist(analyticsId: string, timeout = 5 * 1000): Promise<void> {
      await waitForCondition(
        `data frame analytics job '${analyticsId}' to not exist`,
        async () => {
          const { data_frame_analytics: dfaJobs } = await esClient.ml.getDataFrameAnalytics({
            id: analyticsId,
            allow_no_match: true,
          });
          if (dfaJobs.length === 0) return true;
          throw new Error(`Data frame analytics job '${analyticsId}' still exists`);
        },
        timeout
      );
    },

    async deleteAllJobs(): Promise<void> {
      await measurePerformanceAsync(log, 'mlApi.dataFrameAnalytics.deleteAllJobs', async () => {
        const dfaJobs = await this.getAllJobs();
        for (const job of dfaJobs) {
          // stop and delete are kept separate: a stop failure (e.g. job already stopped)
          // must not prevent the subsequent delete
          try {
            await esClient.ml.stopDataFrameAnalytics({ id: job.id, force: true });
          } catch {
            /* ignore errors */
          }
          try {
            await esClient.ml.deleteDataFrameAnalytics({ id: job.id });
            await this.waitForJobNotToExist(job.id);
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
        await anomalyDetection.deleteAllJobs();
        await anomalyDetection.calendars.deleteAll();
        await anomalyDetection.filters.deleteAll();
        await anomalyDetection.annotations.deleteAll();
        await anomalyDetection.deleteExpiredData();
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
    anomalyDetection,
    dataFrameAnalytics,
    trainedModels,
    ingestPipelines,
    savedObjects,
    indices,
  };
};
