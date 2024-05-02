/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLSearchReponse } from '@kbn/es-types';
import { appendToESQLQuery } from '@kbn/esql-utils';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldStatsResponse } from '../../types';
import {
  DEFAULT_TOP_VALUES_SIZE,
  DEFAULT_SIMPLE_EXAMPLES_SIZE,
  SIMPLE_EXAMPLES_FETCH_SIZE,
} from '../../constants';
import {
  canProvideStatsForFieldTextBased,
  canProvideTopValuesForFieldTextBased,
  canProvideExamplesForField,
} from '../../utils/can_provide_stats';
import { getFieldExampleBuckets } from '../field_examples_calculator';

export type SearchHandlerTextBased = ({ query }: { query: string }) => Promise<ESQLSearchReponse>;

export function buildSearchFilter({
  timeFieldName,
  fromDate,
  toDate,
}: {
  timeFieldName?: string;
  fromDate: string;
  toDate: string;
}) {
  return timeFieldName
    ? {
        range: {
          [timeFieldName]: {
            gte: fromDate,
            lte: toDate,
            format: 'strict_date_optional_time',
          },
        },
      }
    : null;
}

interface FetchAndCalculateFieldStatsParams {
  searchHandler: SearchHandlerTextBased;
  field: DataViewField;
  esqlBaseQuery: string;
}

export async function fetchAndCalculateFieldStats(params: FetchAndCalculateFieldStatsParams) {
  const { field } = params;
  if (!canProvideStatsForFieldTextBased(field)) {
    return {};
  }
  if (field.type === 'boolean') {
    return await getStringTopValues(params, 3);
  }
  if (canProvideTopValuesForFieldTextBased(field)) {
    return await getStringTopValues(params);
  }
  if (canProvideExamplesForField(field, true)) {
    return await getSimpleTextExamples(params);
  }

  return {};
}

export async function getStringTopValues(
  params: FetchAndCalculateFieldStatsParams,
  size = DEFAULT_TOP_VALUES_SIZE
): Promise<FieldStatsResponse<string | boolean>> {
  const { searchHandler, field, esqlBaseQuery } = params;
  const safeEsqlFieldName = getSafeESQLFieldName(field.name);
  const safeEsqlFieldNameTerms = getSafeESQLFieldName(`${field.name}_terms`);
  const esqlQuery = appendToESQLQuery(
    esqlBaseQuery,
    `| WHERE ${safeEsqlFieldName} IS NOT NULL
    | STATS ${safeEsqlFieldNameTerms} = count(${safeEsqlFieldName}) BY ${safeEsqlFieldName}
    | SORT ${safeEsqlFieldNameTerms} DESC
    | LIMIT ${size}`
  );

  const result = await searchHandler({ query: esqlQuery });
  const values = result?.values as Array<[number, string]>;

  if (!values?.length) {
    return {};
  }

  const sampledValues = values?.reduce((acc: number, row) => acc + row[0], 0);

  const topValues = {
    buckets: values.map((value) => ({
      count: value[0],
      key: value[1],
    })),
  };

  return {
    totalDocuments: sampledValues,
    sampledDocuments: sampledValues,
    sampledValues,
    topValues,
  };
}

export async function getSimpleTextExamples(
  params: FetchAndCalculateFieldStatsParams
): Promise<FieldStatsResponse<string | boolean>> {
  const { searchHandler, field, esqlBaseQuery } = params;
  const safeEsqlFieldName = getSafeESQLFieldName(field.name);
  const esqlQuery = appendToESQLQuery(
    esqlBaseQuery,
    `| WHERE ${safeEsqlFieldName} IS NOT NULL
    | KEEP ${safeEsqlFieldName}
    | LIMIT ${SIMPLE_EXAMPLES_FETCH_SIZE}`
  );

  const result = await searchHandler({ query: esqlQuery });
  const values = ((result?.values as Array<[string | string[]]>) || []).map((value) =>
    Array.isArray(value) && value.length === 1 ? value[0] : value
  );

  if (!values?.length) {
    return {};
  }

  const sampledDocuments = values?.length;

  const fieldExampleBuckets = getFieldExampleBuckets({
    values,
    field,
    count: DEFAULT_SIMPLE_EXAMPLES_SIZE,
    isTextBased: true,
  });

  return {
    totalDocuments: sampledDocuments,
    sampledDocuments: fieldExampleBuckets.sampledDocuments,
    sampledValues: fieldExampleBuckets.sampledValues,
    topValues: {
      buckets: fieldExampleBuckets.buckets,
      areExamples: true,
    },
  };
}

function getSafeESQLFieldName(str: string): string {
  return `\`${str}\``;
}
