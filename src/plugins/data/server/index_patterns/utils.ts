/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

export const combineFields = async (fields: FieldDescriptor[][]): Promise<FieldDescriptor[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const indexFieldNameHash: Record<string, number> = {};
      const combined = fields.reduce((acc, f) => [...acc, ...f], []);
      const reduced = combined.reduce((accumulator: FieldDescriptor[], field: FieldDescriptor) => {
        const alreadyExistingIndexField = indexFieldNameHash[field.name];
        if (alreadyExistingIndexField != null) {
          return accumulator;
        }
        accumulator.push(field);
        indexFieldNameHash[field.name] = accumulator.length - 1;
        return accumulator;
      }, []);
      resolve(reduced);
    });
  });
};

/**
 * Creates a single field item.
 *
 * This is a mutatious HOT CODE PATH function that will have array sizes up to 4.7 megs
 * in size at a time calling this function repeatedly. This function should be as optimized as possible
 * and should avoid any and all creation of new arrays, iterating over the arrays or performing
 * any n^2 operations.
 * @param beatFields The beat fields reference
 * @param patternList The pattern
 * @param fieldDescriptor The index its self
 * @param patternListIdx The index within the patternList
 */
export const createFieldItem = (
  beatFields: BeatFields,
  patternList: string[],
  fieldDescriptor: FieldDescriptor,
  patternListIdx: number
): IndexField => {
  const alias = patternList[patternListIdx];
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
    indexes: [alias],
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
 * @param patternList The list of index patterns such as filebeat-*
 */
export const formatFirstFields = async (
  beatFields: BeatFields,
  responsesIndexFields: FieldDescriptor[][],
  patternList: string[]
): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        responsesIndexFields.reduce(
          (accumulator: IndexField[], indexFields: FieldDescriptor[], patternListIdx: number) => {
            [...missingFields, ...indexFields].forEach((index) => {
              const item = createFieldItem(beatFields, patternList, index, patternListIdx);
              accumulator.push(item);
            });
            return accumulator;
          },
          []
        )
      );
    });
  });
};

/**
 * This is a mutatious HOT CODE PATH function that will have array sizes up to 4.7 megs
 * in size at a time when being called. This function should be as optimized as possible
 * and should avoid any and all creation of new arrays, iterating over the arrays or performing
 * any n^2 operations. The `.push`, and `forEach` operations are expected within this function
 * to speed up performance. The "indexFieldNameHash" side effect hash avoids additional expensive n^2
 * look ups.
 *
 * This intentionally waits for the next tick on the event loop to process as the large 4.7 megs
 * has already consumed a lot of the event loop processing up to this function and we want to give
 * I/O opportunity to occur by scheduling this on the next loop.
 * @param fields The index fields to create the secondary fields for
 */
export const formatSecondFields = async (fields: IndexField[]): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const indexFieldNameHash: Record<string, number> = {};
      const reduced = fields.reduce((accumulator: IndexField[], indexfield: IndexField) => {
        const alreadyExistingIndexField = indexFieldNameHash[indexfield.name];
        if (alreadyExistingIndexField != null) {
          const existingIndexField = accumulator[alreadyExistingIndexField];
          if (isEmpty(accumulator[alreadyExistingIndexField].description)) {
            accumulator[alreadyExistingIndexField].description = indexfield.description;
          }
          accumulator[alreadyExistingIndexField].indexes = Array.from(
            new Set([...existingIndexField.indexes, ...indexfield.indexes])
          );
          return accumulator;
        }
        accumulator.push(indexfield);
        indexFieldNameHash[indexfield.name] = accumulator.length - 1;
        return accumulator;
      }, []);
      resolve(reduced);
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
 * @param patternList The list of index patterns
 */
export const formatIndexFields = async (
  responsesIndexFields: FieldDescriptor[][],
  patternList: string[]
): Promise<IndexField[]> => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const beatFields: BeatFields = require('./fields').fieldsBeat;
  const fields = await formatFirstFields(beatFields, responsesIndexFields, patternList);
  const secondFields = await formatSecondFields(fields);
  return secondFields;
};
