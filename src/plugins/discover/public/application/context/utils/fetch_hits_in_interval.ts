/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import { ISearchSource, EsQuerySortValue, SortDirection } from '@kbn/data-plugin/public';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { convertTimeValueToIso } from './date_conversion';
import { IntervalValue } from './generate_intervals';
import type { SurrDocType } from '../services/context';
import type { DiscoverServices } from '../../../build_services';

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
  searchAfter: estypes.SortResults,
  maxCount: number,
  nanosValue: string,
  anchorId: string,
  type: SurrDocType,
  services: DiscoverServices
): Promise<{
  rows: DataTableRecord[];
  interceptedWarnings: SearchResponseWarning[];
}> {
  const { profilesManager } = services;
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

  const adapter = new RequestAdapter();
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
      disableWarningToasts: true,
      inspector: {
        adapter,
        title: type,
      },
    });

  const { rawResponse } = await lastValueFrom(fetch$);
  const dataView = searchSource.getField('index');
  const rows = buildDataTableRecordList({
    records: rawResponse.hits?.hits,
    dataView,
    processRecord: (record) => profilesManager.resolveDocumentProfile({ record }),
  });
  const interceptedWarnings: SearchResponseWarning[] = [];
  services.data.search.showWarnings(adapter, (warning) => {
    interceptedWarnings.push(warning);
    return true; // suppress the default behaviour
  });

  return {
    rows: rows ?? [],
    interceptedWarnings,
  };
}
