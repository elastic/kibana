/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, Logger, RequestHandlerContext } from 'src/core/server';
import type { AppLinkData, SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { createIndexName } from '../lib/create_index_name';
import type { FindSampleObjectsResponseObject } from '../lib/find_sample_objects';
import { findSampleObjects } from '../lib/find_sample_objects';
import { getUniqueObjectTypes } from '../lib/utils';
import { getSavedObjectsClient } from './utils';

const NOT_INSTALLED = 'not_installed';
const INSTALLED = 'installed';
const UNKNOWN = 'unknown';

export const createListRoute = (
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  appLinksMap: Map<string, AppLinkData[]>,
  logger: Logger
) => {
  router.get({ path: '/api/sample_data', validate: false }, async (context, _req, res) => {
    const allExistingObjects = await findExistingSampleObjects(context, logger, sampleDatasets);

    const registeredSampleDatasets = await Promise.all(
      sampleDatasets.map(async (sampleDataset) => {
        const existingObjects = allExistingObjects.get(sampleDataset.id)!;
        const findObjectId = (type: string, id: string) =>
          existingObjects.find((object) => object.type === type && object.id === id)
            ?.foundObjectId ?? id;

        const appLinks = (appLinksMap.get(sampleDataset.id) ?? []).map((data) => {
          const { sampleObject, getPath, label, icon } = data;
          if (sampleObject === null) {
            return { path: getPath(''), label, icon };
          }
          const objectId = findObjectId(sampleObject.type, sampleObject.id);
          return { path: getPath(objectId), label, icon };
        });
        const sampleDataStatus = await getSampleDatasetStatus(
          context,
          allExistingObjects,
          sampleDataset
        );

        return {
          id: sampleDataset.id,
          name: sampleDataset.name,
          description: sampleDataset.description,
          previewImagePath: sampleDataset.previewImagePath,
          darkPreviewImagePath: sampleDataset.darkPreviewImagePath,
          overviewDashboard: findObjectId('dashboard', sampleDataset.overviewDashboard),
          appLinks,
          defaultIndex: findObjectId('index-pattern', sampleDataset.defaultIndex),
          dataIndices: sampleDataset.dataIndices.map(({ id }) => ({ id })),
          ...sampleDataStatus,
        };
      })
    );

    return res.ok({ body: registeredSampleDatasets });
  });
};

type ExistingSampleObjects = Map<string, FindSampleObjectsResponseObject[]>;

async function findExistingSampleObjects(
  context: RequestHandlerContext,
  logger: Logger,
  sampleDatasets: SampleDatasetSchema[]
) {
  const objects = sampleDatasets
    .map(({ savedObjects }) => savedObjects.map(({ type, id }) => ({ type, id })))
    .flat();
  const objectTypes = getUniqueObjectTypes(objects);
  const client = await getSavedObjectsClient(context, objectTypes);
  const findSampleObjectsResult = await findSampleObjects({ client, logger, objects });

  let objectCounter = 0;
  return sampleDatasets.reduce<ExistingSampleObjects>((acc, { id, savedObjects }) => {
    const datasetResults = savedObjects.map(() => findSampleObjectsResult[objectCounter++]);
    return acc.set(id, datasetResults);
  }, new Map());
}

// TODO: introduce PARTIALLY_INSTALLED status (#116677)
async function getSampleDatasetStatus(
  context: RequestHandlerContext,
  existingSampleObjects: ExistingSampleObjects,
  sampleDataset: SampleDatasetSchema
): Promise<{ status: string; statusMsg?: string }> {
  const dashboard = existingSampleObjects
    .get(sampleDataset.id)!
    .find(({ type, id }) => type === 'dashboard' && id === sampleDataset.overviewDashboard);
  if (!dashboard?.foundObjectId) {
    return { status: NOT_INSTALLED };
  }

  const { elasticsearch } = await context.core;

  for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
    const dataIndexConfig = sampleDataset.dataIndices[i];
    const index = createIndexName(sampleDataset.id, dataIndexConfig.id);
    try {
      const indexExists = await elasticsearch.client.asCurrentUser.indices.exists({
        index,
      });
      if (!indexExists) {
        return { status: NOT_INSTALLED };
      }

      const count = await elasticsearch.client.asCurrentUser.count({
        index,
      });
      if (count.count === 0) {
        return { status: NOT_INSTALLED };
      }
    } catch (err) {
      return { status: UNKNOWN, statusMsg: err.message };
    }
  }

  return { status: INSTALLED };
}
