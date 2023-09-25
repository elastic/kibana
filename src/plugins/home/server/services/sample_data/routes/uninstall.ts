/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import {
  SampleDataContext,
  SampleDatasetDashboardPanel,
  SampleDatasetProvider,
  SampleDatasetSchema,
} from '../lib/sample_dataset_registry_types';
import { SampleDataUsageTracker } from '../usage/usage';
import {
  getSampleDataInstaller,
  getSpaceAwareSampleDatasets,
  getSampleDatasetsWithSpaceAwareSavedObjects,
  SAMPLE_DATA_UNINSTALLED_EVENT,
} from './utils';
import { SampleDataInstallError } from '../errors';
import { getSpaceId } from '../../../tutorials/instructions/get_space_id_for_beats_tutorial';
import { SavedObjectsSchema } from '../lib/sample_dataset_schema';

export function createUninstallRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger,
  usageTracker: SampleDataUsageTracker,
  analytics: AnalyticsServiceSetup,
  getScopedContext: (req: KibanaRequest) => SampleDataContext,
  specProviders: Record<string, SampleDatasetProvider>,
  panelReplacementRecords: Record<string, SampleDatasetDashboardPanel[]>,
  additionalSampleDataSavedObjects: Record<string, SavedObjectsSchema>
): void {
  router.delete(
    {
      path: '/api/sample_data/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
    },
    async (context, request, response) => {
      const routeStartTime = performance.now();
      const scopedContext = getScopedContext(request);
      const spaceId = getSpaceId(scopedContext);

      const sampleDataset = sampleDatasets.find(({ id }) => id === request.params.id);

      if (!sampleDataset) {
        return response.notFound();
      }
      const spaceAwareSampleDatasets = getSpaceAwareSampleDatasets(specProviders, spaceId);
      const spaceAwareSampleDataset = spaceAwareSampleDatasets[request.params.id];

      const sampleDatasetsWithSpaceAwareSavedObjects = getSampleDatasetsWithSpaceAwareSavedObjects({
        sampleDatasets,
        spaceAwareSampleDataset,
        panelReplacementRecords: panelReplacementRecords[request.params.id],
        additionalSampleDataSavedObjects: additionalSampleDataSavedObjects[request.params.id],
      });

      const sampleDataInstaller = await getSampleDataInstaller({
        datasetId: sampleDataset.id,
        sampleDatasets: sampleDatasetsWithSpaceAwareSavedObjects,
        logger,
        context,
      });

      try {
        await sampleDataInstaller.uninstall(request.params.id);
        // track the usage operation in a non-blocking way
        usageTracker.addUninstall(request.params.id);

        reportPerformanceMetricEvent(analytics, {
          eventName: SAMPLE_DATA_UNINSTALLED_EVENT,
          duration: performance.now() - routeStartTime,
          key1: sampleDataset.id,
        });
        return response.noContent();
      } catch (e) {
        if (e instanceof SampleDataInstallError) {
          return response.customError({
            body: {
              message: e.message,
            },
            statusCode: e.httpCode,
          });
        }
        throw e;
      }
    }
  );
}
