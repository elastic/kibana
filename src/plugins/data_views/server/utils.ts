/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE, DataViewAttributes, SavedObject, FieldSpec } from '../common';

export const getFieldByName = (
  fieldName: string,
  indexPattern: SavedObject<DataViewAttributes>
): FieldSpec | undefined => {
  const fields: FieldSpec[] = indexPattern && JSON.parse(indexPattern.attributes.fields);
  const field = fields && fields.find((f) => f.name === fieldName);

  return field;
};

export const findIndexPatternById = async (
  savedObjectsClient: SavedObjectsClientContract,
  index: string
): Promise<SavedObject<DataViewAttributes> | undefined> => {
  const savedObjectsResponse = await savedObjectsClient.find<DataViewAttributes>({
    type: DATA_VIEW_SAVED_OBJECT_TYPE,
    fields: ['fields'],
    search: `"${index}"`,
    searchFields: ['title'],
  });

  if (savedObjectsResponse.total > 0) {
    return savedObjectsResponse.saved_objects[0];
  }
};
