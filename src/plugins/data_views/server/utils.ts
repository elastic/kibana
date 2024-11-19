/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE, DataViewAttributes, SavedObject, FieldSpec } from '../common';
import type { QueryDslQueryContainer } from '../common/types';

/**
 * @deprecated Use data views api instead
 */
export const getFieldByName = (
  fieldName: string,
  indexPattern: SavedObject<DataViewAttributes>
): FieldSpec | undefined => {
  const fields: FieldSpec[] = indexPattern && JSON.parse(indexPattern.attributes?.fields || '[]');
  const field = fields && fields.find((f) => f.name === fieldName);

  return field;
};

/**
 * @deprecated Use data views api instead
 */
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

const excludeTiersDsl = (excludedTiers: string) => {
  const _tier = excludedTiers.split(',').map((tier) => tier.trim());
  return {
    bool: {
      must_not: [
        {
          terms: {
            _tier,
          },
        },
      ],
    },
  };
};

interface GetIndexFilterDslOptions {
  indexFilter?: QueryDslQueryContainer;
  excludedTiers?: string;
}

export const getIndexFilterDsl = ({
  indexFilter,
  excludedTiers,
}: GetIndexFilterDslOptions): QueryDslQueryContainer | undefined => {
  if (!indexFilter) {
    return excludedTiers ? excludeTiersDsl(excludedTiers) : undefined;
  }

  return !excludedTiers
    ? indexFilter
    : {
        bool: {
          must: [indexFilter, excludeTiersDsl(excludedTiers)],
        },
      };
};
