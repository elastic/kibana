/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiPanel } from '@elastic/eui';
import { getESQLResults } from '@kbn/esql-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { LatencyMap, isSelectionCondition, parseSelectionCondition } from '@kbn/trace-latency-map';
import type { LatencyMapCell, LatencyMapSelection, RunEsql } from '@kbn/trace-latency-map';
import type { UnifiedMetricsGridProps } from '../../../types';
import { appendWhere, removeWhere } from './latency_map_query_clauses';
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

  const baseFilters = useMemo(
    () => filters.filter((filter) => filter !== selectionClause),
    [filters, selectionClause]
  );
  const source = useStableTraceSource({ indexPattern, filters: baseFilters, timeFrom, timeTo });

  // 'Browser' is Kibana's default time zone setting; the map then uses the browser's.
  const configuredTimeZone = services.uiSettings.get<string>('dateFormat:tz');
  const timeZone =
    !configuredTimeZone || configuredTimeZone === 'Browser' ? undefined : configuredTimeZone;

  const runEsql: RunEsql = useCallback(
    async (query, options) => {
      try {
        const { response } = await getESQLResults({
          esqlQuery: query,
          search: services.data.search.search,
          signal: options?.signal,
        });
        return { columns: response.columns, values: response.values };
      } catch (error) {
        throw new Error(getSearchErrorReason(error));
      }
    },
    [services.data]
  );

  const commitSelection = useCallback(
    (next: LatencyMapSelection | undefined, esqlCondition: string | undefined) => {
      updateESQLQuery?.((query) => {
        const withoutSelection = selectionClause ? removeWhere(query, selectionClause) : query;
        return esqlCondition ? appendWhere(withoutSelection, esqlCondition) : withoutSelection;
      });
    },
    [updateESQLQuery, selectionClause]
  );

  // Opens the newest span of a clicked cell in Discover's document flyout, leaving the
  // query and the selection as they are. Without _id and _index Discover shows the span as
  // given, rather than looking it up in the current query, which may not read that metadata.
  const openExampleSpan = useCallback(
    async (cell: LatencyMapCell) => {
      if (!setExpandedDoc) return;
      let table;
      try {
        table = await runEsql(buildExampleSpanQuery({ indexPattern, filters: baseFilters, cell }));
      } catch {
        // Without the span there is nothing to open; the view stays as it is.
        return;
      }
      const { columns, values } = table;
      const [firstRow] = values;
      if (!firstRow) return;
      const row = Object.fromEntries(columns.map((column, i) => [column.name, firstRow[i]]));
      setExpandedDoc({
        id: `traceLatencyMapExampleSpan-${cell.from}-${cell.minDurationUs}`,
        raw: row as DataTableRecord['raw'],
        flattened: row,
      });
    },
    [setExpandedDoc, runEsql, indexPattern, baseFilters]
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
        onSelectionCommit={commitSelection}
        onCellClick={setExpandedDoc ? openExampleSpan : undefined}
        timeZone={timeZone}
      />
    </EuiPanel>
  );
}
