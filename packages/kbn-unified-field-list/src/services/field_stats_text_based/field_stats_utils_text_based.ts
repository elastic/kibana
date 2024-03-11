/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLSearchReponse } from '@kbn/es-types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldStatsResponse } from '../../types';
import { DEFAULT_TOP_VALUES_SIZE } from '../../constants';
import { canProvideStatsForFieldTextBased } from '../../utils/can_provide_stats';

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
    : {};
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
  if (field.type === 'string' && field.esTypes?.[0] === 'keyword') {
    return await getStringTopValues(params);
  }

  return {};
}

export async function getStringTopValues(
  params: FetchAndCalculateFieldStatsParams,
  size = DEFAULT_TOP_VALUES_SIZE
): Promise<FieldStatsResponse<string | number>> {
  const { searchHandler, field, esqlBaseQuery } = params;
  const esqlQuery =
    esqlBaseQuery +
    `| STATS ${getSafeESQLFieldName(`${field.name}_terms`)} = count(${getSafeESQLFieldName(
      field.name
    )}) BY ${getSafeESQLFieldName(field.name)}
    | LIMIT ${size}
    | SORT ${getSafeESQLFieldName(`${field.name}_terms`)} DESC`;

  const result = await searchHandler({ query: esqlQuery });
  const values = result?.values as Array<[number, string]>;
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

function getSafeESQLFieldName(str: string): string {
  return `\`${str}\``;
}
