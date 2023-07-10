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
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { buildDataTableRecord } from '../../../utils/build_data_record';
import { DISABLE_SHARD_FAILURE_WARNING } from '../../../../common/constants';
import { convertTimeValueToIso } from './date_conversion';
import { IntervalValue } from './generate_intervals';
import type { DataTableRecord, SearchResponseInterceptedWarning } from '../../../types';
import type { SurrDocType } from '../services/context';
import type { DiscoverServices } from '../../../build_services';
import { getSearchResponseInterceptedWarnings } from '../../../utils/get_search_response_intercepted_warnings';

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
  anchorId: string,
  type: SurrDocType,
  services: DiscoverServices
): Promise<{
  rows: DataTableRecord[];
  interceptedWarnings: SearchResponseInterceptedWarning[] | undefined;
}> {
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

  const inspectorAdapters = { requests: new RequestAdapter() };
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
    .fetch$({
      disableShardFailureWarning: DISABLE_SHARD_FAILURE_WARNING,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: type,
      },
    });

  const { rawResponse } = await lastValueFrom(fetch$);
  const dataView = searchSource.getField('index');
  const rows = rawResponse.hits?.hits.map((hit) => buildDataTableRecord(hit, dataView!));

  return {
    rows: rows ?? [],
    interceptedWarnings: getSearchResponseInterceptedWarnings({
      services,
      adapter: inspectorAdapters.requests,
      options: {
        disableShardFailureWarning: DISABLE_SHARD_FAILURE_WARNING,
      },
    }),
  };
}
