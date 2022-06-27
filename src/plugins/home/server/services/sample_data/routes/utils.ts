/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext, Logger } from '@kbn/core/server';
import type { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { SampleDataInstaller } from '../sample_data_installer';
import { getUniqueObjectTypes } from '../lib/utils';

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
