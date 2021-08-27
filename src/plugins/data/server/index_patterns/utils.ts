/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObjectsClientContract } from '../../../../core/server/saved_objects/types';
import type { SavedObject } from '../../../../core/types/saved_objects';
import { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { IFieldType } from '../../common/index_patterns/fields/types';
import type { IndexPatternAttributes } from '../../common/index_patterns/types';

export const getFieldByName = (
  fieldName: string,
  indexPattern: SavedObject<IndexPatternAttributes>
): IFieldType | undefined => {
  const fields: IFieldType[] = indexPattern && JSON.parse(indexPattern.attributes.fields);
  const field = fields && fields.find((f) => f.name === fieldName);

  return field;
};

export const findIndexPatternById = async (
  savedObjectsClient: SavedObjectsClientContract,
  index: string
): Promise<SavedObject<IndexPatternAttributes> | undefined> => {
  const savedObjectsResponse = await savedObjectsClient.find<IndexPatternAttributes>({
    type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
    fields: ['fields'],
    search: `"${index}"`,
    searchFields: ['title'],
  });

  if (savedObjectsResponse.total > 0) {
    return savedObjectsResponse.saved_objects[0];
  }
};
