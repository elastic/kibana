/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ProjectRouting } from '@kbn/es-query';
import type { DateRangePickerProps } from '@kbn/date-range-picker';
import type { ISearchGeneric } from '@kbn/search-types';

type GetFullDataRange = NonNullable<DateRangePickerProps['getFullDataRange']>;
type FullDataRange = Awaited<ReturnType<GetFullDataRange>>;

export interface GetDataViewTimeRangeArgs {
  /** Data view whose index pattern, time field and runtime fields are queried. */
  dataView: DataView;
  /** Search function, typically `data.search.search`. */
  search: ISearchGeneric;
  /** Aborts the search request. */
  signal?: AbortSignal;
  /**
   * Cross-project search routing. When omitted the search service applies the
   * global project routing.
   */
  projectRouting?: ProjectRouting;
}

/**
 * Returns the earliest and latest timestamps of a data view's time field as ISO
 * strings, or `null` when the data view is not time based or has no data.
 */
export const getDataViewTimeRange = async ({
  dataView,
  search,
  signal,
  projectRouting,
}: GetDataViewTimeRangeArgs): Promise<FullDataRange> => {
  const { timeFieldName } = dataView;
  if (!timeFieldName) return null;

  const runtimeMappings = dataView.getRuntimeMappings();
  const { rawResponse } = await lastValueFrom(
    search(
      {
        params: {
          index: dataView.getIndexPattern(),
          size: 0,
          track_total_hits: false,
          aggs: {
            earliest: { min: { field: timeFieldName } },
            latest: { max: { field: timeFieldName } },
          },
          ...(Object.keys(runtimeMappings).length > 0 ? { runtime_mappings: runtimeMappings } : {}),
        },
      },
      { abortSignal: signal, ...(projectRouting ? { projectRouting } : {}) }
    )
  );

  const aggregations = rawResponse.aggregations as
    | Record<'earliest' | 'latest', estypes.AggregationsMinAggregate>
    | undefined;
  const earliest = aggregations?.earliest.value;
  const latest = aggregations?.latest.value;
  if (typeof earliest !== 'number' || typeof latest !== 'number') return null;

  return {
    start: new Date(earliest).toISOString(),
    end: new Date(latest).toISOString(),
  };
};

/**
 * Builds a `getFullDataRange` callback for `DateRangePicker` from a data view,
 * or returns `undefined` when the data view is missing or not time based so the
 * "Use full data" option is hidden.
 */
export const createGetFullDataRange = ({
  dataView,
  search,
  projectRouting,
}: {
  dataView?: DataView;
  search: ISearchGeneric;
  projectRouting?: ProjectRouting;
}): GetFullDataRange | undefined => {
  if (!dataView?.timeFieldName) return undefined;
  return (signal) => getDataViewTimeRange({ dataView, search, signal, projectRouting });
};
