/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { lastValueFrom } from 'rxjs';
import { ISearchSource, EsQuerySortValue, SortDirection } from '@kbn/data-plugin/public';
import { EsQuerySearchAfter } from '@kbn/data-plugin/common';
import { buildDataTableRecord } from '../../../utils/build_data_record';
import { convertTimeValueToIso } from './date_conversion';
import { IntervalValue } from './generate_intervals';
import type { DataTableRecord } from '../../../types';

interface RangeQuery {
  format: string;
  lte?: string | null;
  gte?: string | null;
}

/**
 * Fetch the hits between a given `interval` up to a maximum of `maxCount` documents.
 * The documents are sorted by `sort`
 *
 * The `searchSource` is assumed to have the appropriate data view
 * and filters set.
 */
export async function fetchHitsInInterval(
  searchSource: ISearchSource,
  timeField: string,
  sort: [EsQuerySortValue, EsQuerySortValue],
  sortDir: SortDirection,
  interval: IntervalValue[],
  searchAfter: EsQuerySearchAfter,
  maxCount: number,
  nanosValue: string,
  anchorId: string
): Promise<DataTableRecord[]> {
  const range: RangeQuery = {
    format: 'strict_date_optional_time',
  };
  const [start, stop] = interval;

  if (start) {
    range[sortDir === SortDirection.asc ? 'gte' : 'lte'] = convertTimeValueToIso(start, nanosValue);
  }

  if (stop) {
    range[sortDir === SortDirection.asc ? 'lte' : 'gte'] = convertTimeValueToIso(stop, nanosValue);
  }
  const fetch$ = searchSource
    .setField('size', maxCount)
    .setField('query', {
      query: {
        bool: {
          must: {
            constant_score: {
              filter: {
                range: {
                  [timeField]: range,
                },
              },
            },
          },
          must_not: {
            ids: {
              values: [anchorId],
            },
          },
        },
      },
      language: 'lucene',
    })
    .setField('searchAfter', searchAfter)
    .setField('sort', sort)
    .setField('version', true)
    .fetch$();

  const { rawResponse } = await lastValueFrom(fetch$);
  const dataView = searchSource.getField('index');
  const records = rawResponse.hits?.hits.map((hit) => buildDataTableRecord(hit, dataView!));

  return records ?? [];
}
