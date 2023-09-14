/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext, Logger } from '@kbn/core/server';
import type {
  SampleDatasetDashboardPanel,
  SampleDatasetProvider,
  SampleDatasetSchema,
} from '../lib/sample_dataset_registry_types';
import { SampleDataInstaller } from '../sample_data_installer';
import { getUniqueObjectTypes } from '../lib/utils';
import { SavedObjectSchema, SavedObjectsSchema } from '../lib/sample_dataset_schema';

export const SAMPLE_DATA_INSTALLED_EVENT = 'sample_data_installed';
export const SAMPLE_DATA_UNINSTALLED_EVENT = 'sample_data_uninstalled';

export const getSampleDataInstaller = async ({
  datasetId,
  context,
  sampleDatasets,
  logger,
}: {
  datasetId: string;
  context: RequestHandlerContext;
  sampleDatasets: SampleDatasetSchema[];
  logger: Logger;
}) => {
  const core = await context.core;
  const sampleDataset = sampleDatasets.find(({ id }) => id === datasetId)!;
  const { getImporter, client: soClient } = core.savedObjects;
  const objectTypes = getUniqueObjectTypes(sampleDataset.savedObjects);
  const savedObjectsClient = await getSavedObjectsClient(context, objectTypes);
  const soImporter = getImporter(savedObjectsClient);

  return new SampleDataInstaller({
    esClient: core.elasticsearch.client,
    soImporter,
    soClient,
    logger,
    sampleDatasets,
  });
};

export const getSavedObjectsClient = async (
  context: RequestHandlerContext,
  objectTypes: string[]
) => {
  const { getClient, typeRegistry } = (await context.core).savedObjects;
  const includedHiddenTypes = objectTypes.filter((supportedType) =>
    typeRegistry.isHidden(supportedType)
  );
  return getClient({ includedHiddenTypes });
};

export const getSpaceAwareSampleDatasets = (
  specProviders: Record<string, SampleDatasetProvider>,
  spaceId: string
) =>
  Object.entries(specProviders).reduce<Record<string, SampleDatasetSchema>>(
    (acc, [specProviderId, specProvider]) => ({
      ...acc,
      [specProviderId]: specProvider(spaceId),
    }),
    {}
  );

export const getDashboardReferenceByIdFromDataset = ({
  sampleDatasets,
  sampleDataId,
  dashboardId,
  referenceId,
}: {
  sampleDatasets: SampleDatasetSchema[];
  sampleDataId: string;
  dashboardId: string;
  referenceId: string;
}) => {
  const sampleDataset = sampleDatasets.find((dataset) => {
    return dataset.id === sampleDataId;
  });
  if (!sampleDataset) {
    throw new Error(`Unable to find sample dataset with id: ${sampleDataId}`);
  }

  const dashboard = sampleDataset.savedObjects.find((savedObject) => {
    return savedObject.id === dashboardId && savedObject.type === 'dashboard';
  }) as SavedObjectSchema;
  if (!dashboard) {
    throw new Error(`Unable to find dashboard with id: ${dashboardId}`);
  }

  const reference = dashboard.references.find((referenceItem: any) => {
    return referenceItem.id === referenceId;
  });
  if (!reference) {
    throw new Error(`Unable to find reference for embeddable: ${referenceId}`);
  }

  return { sampleDataset, dashboard, reference };
};

export const getSampleDatasetsWithSpaceAwareSavedObjects = ({
  sampleDatasets,
  spaceAwareSampleDataset,
  panelReplacementRecords = [],
  additionalSampleDataSavedObjects = [],
}: {
  sampleDatasets: SampleDatasetSchema[]; // This has the **additional** or **replaced** visualizations from other plugins
  spaceAwareSampleDataset: SampleDatasetSchema; // This is space aware, but not aware of addition or replacement from other plugins
  panelReplacementRecords: SampleDatasetDashboardPanel[];
  additionalSampleDataSavedObjects: SavedObjectsSchema;
}) =>
  sampleDatasets.map((sampleDataset) => ({
    ...(sampleDataset.id === spaceAwareSampleDataset.id ? spaceAwareSampleDataset : sampleDataset),
    savedObjects: spaceAwareSampleDataset.savedObjects
      .concat(additionalSampleDataSavedObjects)
      .map((savedObject) => {
        const replacementRecord = panelReplacementRecords.find(
          (data) => data.dashboardId === savedObject.id
        );
        const replacedDashboard =
          replacementRecord && savedObject.type === 'dashboard' ? savedObject : undefined;

        if (replacedDashboard != null && replacedDashboard.references != null) {
          return {
            ...replacedDashboard,
            references: replacedDashboard.references.map((dashboardReference) =>
              replacementRecord && dashboardReference.id === replacementRecord.oldEmbeddableId
                ? getDashboardReferenceByIdFromDataset({
                    sampleDatasets,
                    sampleDataId: replacementRecord.sampleDataId,
                    dashboardId: replacementRecord.dashboardId,
                    referenceId: replacementRecord.embeddableId,
                  }).reference
                : dashboardReference
            ),
          };
        }

        return savedObject;
      }),
  }));
