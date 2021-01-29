/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import isEmpty from 'lodash/isEmpty';
import {
  BeatFields,
  FieldDescriptor,
  IFieldType,
  IndexField,
  IndexPatternAttributes,
  SavedObject,
} from '../../common';

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
    type: 'index-pattern',
    fields: ['fields'],
    search: `"${index}"`,
    searchFields: ['title'],
  });

  if (savedObjectsResponse.total > 0) {
    return savedObjectsResponse.saved_objects[0];
  }
};

const missingFields: FieldDescriptor[] = [
  {
    name: '_id',
    type: 'string',
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: '_index',
    type: 'string',
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
];

/**
 * Creates a single field item.
 *
 * This is a mutatious HOT CODE PATH function that will have array sizes up to 4.7 megs
 * in size at a time calling this function repeatedly. This function should be as optimized as possible
 * and should avoid any and all creation of new arrays, iterating over the arrays or performing
 * any n^2 operations.
 * @param beatFields The beat fields reference
 * @param fieldDescriptor The index its self
 */
export const createFieldItem = (
  beatFields: BeatFields,
  fieldDescriptor: FieldDescriptor
): IndexField => {
  const splitFieldName = fieldDescriptor.name.split('.');
  const fieldName =
    splitFieldName[splitFieldName.length - 1] === 'text'
      ? splitFieldName.slice(0, splitFieldName.length - 1).join('.')
      : fieldDescriptor.name;

  const beatField = beatFields[fieldName] ?? {};
  if (isEmpty(beatField.category)) {
    beatField.category = splitFieldName[0];
  }
  return {
    ...beatField,
    ...fieldDescriptor,
  };
};

/**
 * This is a mutatious HOT CODE PATH function that will have array sizes up to 4.7 megs
 * in size at a time when being called. This function should be as optimized as possible
 * and should avoid any and all creation of new arrays, iterating over the arrays or performing
 * any n^2 operations. The `.push`, and `forEach` operations are expected within this function
 * to speed up performance.
 *
 * This intentionally waits for the next tick on the event loop to process as the large 4.7 megs
 * has already consumed a lot of the event loop processing up to this function and we want to give
 * I/O opportunity to occur by scheduling this on the next loop.
 * @param beatFields The beatFields to reference
 * @param responsesIndexFields The response index fields to loop over
 */
export const formatFirstFields = async (
  beatFields: BeatFields,
  responsesIndexFields: FieldDescriptor[]
): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        [...missingFields, ...responsesIndexFields].reduce(
          (accumulator: IndexField[], fieldDescriptor: FieldDescriptor) => {
            const item = createFieldItem(beatFields, fieldDescriptor);
            return [...accumulator, item];
          },
          []
        )
      );
    });
  });
};

/**
 * Formats the index fields into a format the UI wants.
 *
 * NOTE: This will have array sizes up to 4.7 megs in size at a time when being called.
 * This function should be as optimized as possible and should avoid any and all creation
 * of new arrays, iterating over the arrays or performing any n^2 operations.
 * @param responsesIndexFields  The response index fields to format
 */
export const formatIndexFields = async (
  responsesIndexFields: FieldDescriptor[]
): Promise<IndexField[]> => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const beatFields: BeatFields = require('./fields').fieldsBeat;
  return formatFirstFields(beatFields, responsesIndexFields);
};
