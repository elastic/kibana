/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiPanel } from '@elastic/eui';
import { getESQLResults } from '@kbn/esql-utils';
import { getTimeZoneFromSettings } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  FAILED_SPAN_CONDITION,
  LatencyMap,
  isFailedOnlyCondition,
  isSelectionCondition,
  parseSelectionCondition,
} from '@kbn/trace-latency-map';
import type { LatencyMapCell, LatencyMapSelection, RunEsql } from '@kbn/trace-latency-map';
import type { UnifiedMetricsGridProps } from '../../../types';
import { extractFilters } from '../../../utils';
import { appendMapClause, removeWhere } from './latency_map_query_clauses';
import { buildExampleSpanQuery } from './example_span_query';
import { getSearchErrorReason } from './search_error';
import { useStableTraceSource } from './use_stable_trace_source';

export interface TracesLatencyMapViewProps {
  indexPattern: string;
  /** WHERE expressions of the Discover query. */
  filters: string[];
  timeFrom?: string;
  timeTo?: string;
  services: UnifiedMetricsGridProps['services'];
  actions: UnifiedMetricsGridProps['actions'];
}

/**
 * The latency map in the Discover traces chart section. The selection lives in the ES|QL
 * query, so the documents table follows it and it survives a reload. The map reads the
 * query without the selection, so it always shows the whole range.
 */
export function TracesLatencyMapView({
  indexPattern,
  filters,
  timeFrom,
  timeTo,
  services,
  actions,
}: TracesLatencyMapViewProps) {
  const { updateESQLQuery, setExpandedDoc } = actions;
  const selectionClause = filters.find(isSelectionCondition);
  const selection = selectionClause ? parseSelectionCondition(selectionClause) : undefined;
  const failedOnly = filters.some(isFailedOnlyCondition);

  // The map reads the query without its own clauses: the whole range, failed and not, so it
  // can paint "failed only" from the counts it has and show what a selection would catch.
  const baseFilters = useMemo(
    () => filters.filter((filter) => filter !== selectionClause && !isFailedOnlyCondition(filter)),
    [filters, selectionClause]
  );
  const source = useStableTraceSource({ indexPattern, filters: baseFilters, timeFrom, timeTo });

  // 'Browser' resolves to the browser's own zone, which is also what the map defaults to.
  const timeZone = getTimeZoneFromSettings(services.uiSettings.get<string>('dateFormat:tz'));

  const runEsql: RunEsql = useCallback(
    async (query, options) => {
      try {
        const { response } = await getESQLResults({
          esqlQuery: query,
          search: services.data.search.search,
          signal: options?.signal,
        });
        return response;
      } catch (error) {
        throw new Error(getSearchErrorReason(error));
      }
    },
    [services.data]
  );

  const commitSelection = useCallback(
    (next: LatencyMapSelection | undefined, esqlCondition: string | undefined) => {
      updateESQLQuery?.((query) => {
        // The clause to replace is found in the query being updated, not taken from the
        // rendered props: a quick second commit runs before Discover pushes the refreshed
        // fetch params, and the clause captured at render time would then be stale.
        const withoutSelection = extractFilters(query)
          .filter(isSelectionCondition)
          .reduce(removeWhere, query);
        return esqlCondition ? appendMapClause(withoutSelection, esqlCondition) : withoutSelection;
      });
    },
    [updateESQLQuery]
  );

  // The "Failed only" switch is a filter of the query itself, like the selection: the
  // documents table follows it, it survives a reload and a shared link carries it.
  const changeFailedOnly = useCallback(
    (next: boolean) => {
      updateESQLQuery?.((query) => {
        // Found in the query being updated, not in the rendered props, as in commitSelection.
        const withoutFailedOnly = extractFilters(query)
          .filter(isFailedOnlyCondition)
          .reduce(removeWhere, query);
        return next ? appendMapClause(withoutFailedOnly, FAILED_SPAN_CONDITION) : withoutFailedOnly;
      });
    },
    [updateESQLQuery]
  );

  // Only the latest click may open the flyout; a slower earlier fetch is discarded.
  const clickAbortRef = useRef<AbortController>();
  useEffect(() => () => clickAbortRef.current?.abort(), []);

  // Opens the newest span of a clicked cell in Discover's document flyout, leaving the
  // query and the selection as they are. Without _id and _index Discover shows the span as
  // given, rather than looking it up in the current query, which may not read that metadata.
  const openExampleSpan = useCallback(
    async (cell: LatencyMapCell) => {
      if (!setExpandedDoc) return;
      clickAbortRef.current?.abort();
      const controller = new AbortController();
      clickAbortRef.current = controller;
      let response;
      try {
        ({ response } = await getESQLResults({
          esqlQuery: buildExampleSpanQuery({ indexPattern, filters: baseFilters, cell }),
          search: services.data.search.search,
          signal: controller.signal,
          // One row of wide traces indices: without this every mapped field comes back null.
          dropNullColumns: true,
        }));
      } catch {
        // Without the span there is nothing to open; the view stays as it is.
        return;
      }
      if (controller.signal.aborted) return;
      const { columns, values } = response;
      const [firstRow] = values;
      if (!firstRow) return;
      const row = Object.fromEntries(columns.map((column, i) => [column.name, firstRow[i]]));
      setExpandedDoc({
        id: `traceLatencyMapExampleSpan-${cell.from}-${cell.minDuration}`,
        raw: row as DataTableRecord['raw'],
        flattened: row,
      });
    },
    [setExpandedDoc, indexPattern, baseFilters, services.data]
  );

  if (!source) return null;

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="s"
      // The chart section can be resized smaller than the map; scroll rather than clip.
      css={css`
        height: 100%;
        overflow-y: auto;
      `}
    >
      <LatencyMap
        source={source}
        runEsql={runEsql}
        selection={selection}
        failedOnly={failedOnly}
        onFailedOnlyChange={changeFailedOnly}
        onSelectionCommit={commitSelection}
        onCellClick={setExpandedDoc ? openExampleSpan : undefined}
        timeZone={timeZone}
      />
    </EuiPanel>
  );
}
