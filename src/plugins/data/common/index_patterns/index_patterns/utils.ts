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

// eslint-disable-next-line no-restricted-imports
import isEmpty from 'lodash/isEmpty';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FieldDescriptor } from '../../../server/index_patterns/fetcher';
import { BeatFields, IndexField } from '../types';

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
 * @param indexesAlias The index alias
 * @param index The index its self
 * @param indexesAliasIdx The index within the alias
 */
export const createFieldItem = (
  beatFields: BeatFields,
  indexesAlias: string[],
  index: FieldDescriptor,
  indexesAliasIdx: number
): IndexField => {
  const alias = indexesAlias[indexesAliasIdx];
  const splitIndexName = index.name.split('.');
  const indexName =
    splitIndexName[splitIndexName.length - 1] === 'text'
      ? splitIndexName.slice(0, splitIndexName.length - 1).join('.')
      : index.name;
  const beatIndex = beatFields[indexName] ?? {};
  if (isEmpty(beatIndex.category)) {
    beatIndex.category = splitIndexName[0];
  }
  return {
    ...beatIndex,
    ...index,
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
 * @param responsesIndexFields The response index fields to loop over
 * @param indexesAlias The index aliases such as filebeat-*
 */
export const formatFirstFields = async (
  beatFields: BeatFields,
  responsesIndexFields: FieldDescriptor[][],
  indexesAlias: string[]
): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        responsesIndexFields.reduce(
          (accumulator: IndexField[], indexFields: FieldDescriptor[], indexesAliasIdx: number) => {
            missingFields.forEach((index) => {
              const item = createFieldItem(beatFields, indexesAlias, index, indexesAliasIdx);
              accumulator.push(item);
            });
            indexFields.forEach((index) => {
              const item = createFieldItem(beatFields, indexesAlias, index, indexesAliasIdx);
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
 * @param indexesAlias The index alias
 */
export const formatIndexFields = async (
  responsesIndexFields: FieldDescriptor[][],
  indexesAlias: string[]
): Promise<IndexField[]> => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const beatFields: BeatFields = require('./fields').fieldsBeat;
  const fields = await formatFirstFields(beatFields, responsesIndexFields, indexesAlias);
  const secondFields = await formatSecondFields(fields);
  return secondFields;
};
