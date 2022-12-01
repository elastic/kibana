/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { SavedObjectsRequestHandlerContext } from '@kbn/core-saved-objects-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Readable } from 'stream';

const LARGE_DATASET_INDEX = 'kibana_sample_data_large';
const LARGE_DATASET_DATA_VIEW = 'Kibana Sample Data Large';

const dataView = (indexName: string, dataViewName: string) => {
  return {
    id: uuid.v4(),
    type: 'index-pattern',
    updated_at: Date.now().toString(),
    version: '1',
    migrationVersion: {},
    attributes: {
      title: indexName,
      name: dataViewName,
      timeFieldName: 'last_updated',
    },
    references: [],
  };
};

export const createDataView = async (
  savedObjects: SavedObjectsRequestHandlerContext,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const { getImporter } = savedObjects;
  const soImporter = getImporter(savedObjectsClient);

  const dataViewToSave = [dataView(LARGE_DATASET_INDEX, LARGE_DATASET_DATA_VIEW)];
  await findAndDeleteDataView(savedObjectsClient);
  const readStream = Readable.from(dataViewToSave);
  const { errors = [] } = await soImporter.import({
    readStream,
    overwrite: true,
    createNewCopies: false,
  });
  return { errors };
};

export const findAndDeleteDataView = async (savedObjectsClient: SavedObjectsClientContract) => {
  const findResult = await savedObjectsClient.find({
    type: 'index-pattern',
    fields: ['attributes.title'],
    search: LARGE_DATASET_INDEX,
  });
  if (findResult.total > 0) {
    await savedObjectsClient.delete('index-pattern', findResult.saved_objects[0].id);
  }
};
