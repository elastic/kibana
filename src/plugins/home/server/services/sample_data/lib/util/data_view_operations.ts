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
  indexName: string,
  dataViewName: string,
  savedObjects: SavedObjectsRequestHandlerContext,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const { getImporter } = savedObjects;
  const soImporter = getImporter(savedObjectsClient);

  const dataViewToSave = [dataView(indexName, dataViewName)];
  await findAndDeleteDataView(indexName, savedObjectsClient);
  const readStream = Readable.from(dataViewToSave);
  const { errors = [] } = await soImporter.import({
    readStream,
    overwrite: true,
    createNewCopies: false,
  });
  return { errors };
};

export const findAndDeleteDataView = async (
  indexName: string,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const findResult = await savedObjectsClient.find({
    type: 'index-pattern',
    fields: ['attributes.title'],
    search: indexName,
  });
  if (findResult.total > 0) {
    await savedObjectsClient.delete('index-pattern', findResult.saved_objects[0].id);
  }
};
