/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiPanel } from '@elastic/eui';
import { cleanFilter, getTimeZoneFromSettings, isFilterDisabled } from '@kbn/es-query';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getDocId } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  FAILED_SPAN_CONDITION,
  LatencyMap,
  TRACE_CONDITION_FIELDS,
  isFailedOnlyCondition,
  isOperationCondition,
  isSelectionCondition,
  parseOperationCondition,
  parseSelectionCondition,
} from '@kbn/trace-latency-map';
import type {
  LatencyMapCell,
  LatencyMapOperation,
  LatencyMapSelection,
  RunEsql,
} from '@kbn/trace-latency-map';
import type { UnifiedMetricsGridProps } from '../../../types';
import { expressionReadsParams } from '../../../utils/esql_commands';
import { replaceMapClause } from './latency_map_query_clauses';
import { buildExampleSpanQuery } from './example_span_query';
import { getSearchErrorReason } from './search_error';
import { useStableTraceSource } from './use_stable_trace_source';

/** How far outside the time range a selection may sit before it counts as left behind. */
const RANGE_CLEAR_GRACE_MS = 60_000;

/** What Discover applies to its own query besides the text, and the map's queries run under. */
export interface TracesSearchContext {
  /** The filter pills, pinned and not. */
  filters?: Filter[];
  /** The ES|QL controls' values. */
  esqlVariables?: ESQLControlVariable[];
  /** Fills `?_tstart` and `?_tend` for a user filter that names them. */
  timeRange?: TimeRange;
  searchSessionId?: string;
}

export interface TracesLatencyMapViewProps {
  indexPattern: string;
  /** WHERE expressions of the Discover query. */
  filters: string[];
  timeFrom?: string;
  timeTo?: string;
  /** The range as the time picker holds it, relative or absolute. */
  relativeTimeRange?: TimeRange;
  searchContext?: TracesSearchContext;
  services: UnifiedMetricsGridProps['services'];
  actions: UnifiedMetricsGridProps['actions'];
  /** Discover's documents query is running, as after a committed selection rewrites it. */
  isChartLoading?: boolean;
  /** The id of the document open in Discover's flyout, if any. */
  expandedDocId?: string;
}

/**
 * The search context as a key: a change loads the map again. Disabled filters apply to
 * nothing, and pinning changes nothing of what a filter selects, so neither reloads. The
 * time range counts only while a query filter reads it through `?_tstart`/`?_tend`: then
 * the values the map counted with must be the ones an example span is looked up with.
 */
const getContextKey = (
  { filters = [], esqlVariables = [], timeRange }: TracesSearchContext,
  queryFilters: string[]
) =>
  JSON.stringify({
    filters: filters
      .filter((filter) => !isFilterDisabled(filter))
      .map((filter) => [Boolean(filter.meta?.negate), cleanFilter(filter)]),
    variables: esqlVariables,
    ...(queryFilters.some((filter) => expressionReadsParams(filter, TIME_PARAMS))
      ? { timeRange }
      : {}),
  });

/**
 * Whether the cell lies within the selection: its spans are among the selection's. The
 * bounds are compared as the query writes them - whole nanoseconds, rounded up - so a cell
 * starting on the selection's own edge is inside it.
 */
const isCellWithin = (cell: LatencyMapCell, selection: LatencyMapSelection) =>
  Date.parse(cell.from) >= Date.parse(selection.from) &&
  Date.parse(cell.to) <= Date.parse(selection.to) &&
  Math.ceil(cell.minDuration) >= Math.ceil(selection.minDuration) &&
  Math.ceil(cell.maxDuration) <= Math.ceil(selection.maxDuration);

/** The named params a query filter reads the time range through. */
const TIME_PARAMS = ['_tstart', '_tend'];

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
  relativeTimeRange,
  searchContext = {},
  services,
  actions,
  isChartLoading,
  expandedDocId,
}: TracesLatencyMapViewProps) {
  const { updateESQLQuery, setExpandedDoc } = actions;
  const selectionClause = filters.find(isSelectionCondition);
  // One object per clause: parsed anew every render, the map would redraw for nothing.
  const selection = useMemo(
    () => (selectionClause ? parseSelectionCondition(selectionClause) : undefined),
    [selectionClause]
  );
  const failedOnly = filters.some(isFailedOnlyCondition);
  // The focused operation lives in the query too, so a reload or a shared link restores it.
  const operationClause = filters.find(isOperationCondition);
  const focusedOperation = useMemo(
    () => (operationClause ? parseOperationCondition(operationClause) : undefined),
    [operationClause]
  );

  // The map reads the query without its own clauses: the whole range, failed and not, so it
  // can paint "failed only" from the counts it has and show what a selection would catch.
  const baseFilters = useMemo(
    () => filters.filter((filter) => filter !== selectionClause && !isFailedOnlyCondition(filter)),
    [filters, selectionClause]
  );
  const { filters: kibanaFilters, esqlVariables, timeRange, searchSessionId } = searchContext;
  const contextKey = useMemo(
    () => getContextKey({ filters: kibanaFilters, esqlVariables, timeRange }, baseFilters),
    [kibanaFilters, esqlVariables, timeRange, baseFilters]
  );
  const source = useStableTraceSource({
    indexPattern,
    filters: baseFilters,
    timeFrom,
    timeTo,
    relativeTimeRange,
    contextKey,
  });

  // Every query of the map runs as Discover's own does: under its filter pills and its ES|QL
  // controls, in its search session. The time range fills `?_tstart`/`?_tend` for a filter
  // that names them, and clips nothing: the map's queries carry their own absolute range.
  // The session is not part of the source's key: a refresh does not reload the map.
  const searchEsql = useCallback(
    (
      query: string,
      { signal, dropNullColumns }: { signal?: AbortSignal; dropNullColumns?: boolean }
    ) =>
      services.data.search.esql(
        { query, dropNullColumns, kibanaQueryContext: { kibanaFilters, esqlVariables, timeRange } },
        {
          abortSignal: signal,
          sessionId: searchSessionId,
          executionContext: { type: 'discover', name: 'traces_latency_map' },
        }
      ),
    [services.data, kibanaFilters, esqlVariables, timeRange, searchSessionId]
  );

  // 'Browser' resolves to the browser's own zone, which is also what the map defaults to.
  const timeZone = getTimeZoneFromSettings(services.uiSettings.get<string>('dateFormat:tz'));

  // Whether a written clause still needs `SET unmapped_fields="NULLIFY"`: one field-caps
  // call per pattern says if every field the clauses reference is mapped somewhere under
  // it - then the SET is dropped and the user's query stays as short as it can be. Until
  // the answer arrives, or if the check fails, the safe default keeps the SET.
  const nullifyRef = useRef(true);
  useEffect(() => {
    nullifyRef.current = true;
    const controller = new AbortController();
    services.dataViews
      .getFieldsForWildcard({
        pattern: indexPattern,
        fields: [...TRACE_CONDITION_FIELDS],
        abortSignal: controller.signal,
      })
      .then((fields) => {
        if (controller.signal.aborted) return;
        const mapped = new Set(fields.map((field) => field.name));
        nullifyRef.current = !TRACE_CONDITION_FIELDS.every((name) => mapped.has(name));
      })
      .catch(() => {
        // The default stands: a clause with the SET always runs.
      });
    return () => controller.abort();
  }, [services.dataViews, indexPattern]);

  const runEsql: RunEsql = useCallback(
    async (query, options) => {
      try {
        const { rawResponse } = await searchEsql(query, { signal: options?.signal });
        return rawResponse;
      } catch (error) {
        throw new Error(getSearchErrorReason(error));
      }
    },
    [searchEsql]
  );

  // Everything the map does to the documents is a clause of the query, one of each kind:
  // the selection, the focused operation, "Errors only". The clause to replace is found in
  // the query being updated, not taken from the rendered props: a quick second commit runs
  // before Discover pushes the refreshed fetch params, and a clause captured at render
  // time would then be stale.
  const replaceClause = useCallback(
    (isClause: (condition: string) => boolean, clause: string | undefined) => {
      updateESQLQuery?.((query) =>
        replaceMapClause(query, isClause, clause, { nullify: nullifyRef.current })
      );
    },
    [updateESQLQuery]
  );

  const commitSelection = useCallback(
    (_selection: LatencyMapSelection | undefined, esqlCondition: string | undefined) =>
      replaceClause(isSelectionCondition, esqlCondition),
    [replaceClause]
  );

  // Focusing an operation narrows the query itself, like the selection and "Errors only":
  // the documents table follows, and the map's source keeps the clause - unlike the other
  // two, it narrows what the map shows, which is the point.
  const focusOperation = useCallback(
    (_operation: LatencyMapOperation, esqlCondition: string) =>
      replaceClause(isOperationCondition, esqlCondition),
    [replaceClause]
  );
  const clearOperation = useCallback(
    () => replaceClause(isOperationCondition, undefined),
    [replaceClause]
  );

  // A selection left outside the picked time range matches nothing: the query would strand
  // the user on the no-results screen, with the map gone. A range that no longer overlaps
  // the selection at all clears it; a partial overlap keeps it, as results still exist. The
  // grace keeps a short relative window, re-resolved seconds later, from eating a selection
  // just drawn at its edge.
  const selectionOutOfRange = Boolean(
    selection &&
    source &&
    (Date.parse(selection.to) <= Date.parse(source.timeRange.from) - RANGE_CLEAR_GRACE_MS ||
      Date.parse(selection.from) >= Date.parse(source.timeRange.to) + RANGE_CLEAR_GRACE_MS)
  );
  useEffect(() => {
    if (selectionOutOfRange) commitSelection(undefined, undefined);
  }, [selectionOutOfRange, commitSelection]);

  // The "Errors only" switch is a filter of the query itself, like the selection: the
  // documents table follows it, it survives a reload and a shared link carries it.
  const changeFailedOnly = useCallback(
    (next: boolean) =>
      replaceClause(isFailedOnlyCondition, next ? FAILED_SPAN_CONDITION : undefined),
    [replaceClause]
  );

  // Only the latest click may open the flyout; a slower earlier fetch is discarded, and so
  // is one still running when the map's source changes under it: its span may no longer be
  // among the documents.
  const clickAbortRef = useRef<AbortController>();
  useEffect(() => () => clickAbortRef.current?.abort(), []);

  // The cell whose span the flyout shows, outlined on the map while it does: from the click
  // (at once, while the span loads) until the flyout closes or shows another document, or
  // the map's cells change under it.
  const [activeCell, setActiveCell] = useState<LatencyMapCell>();
  const openedDocIdRef = useRef<string>();
  useEffect(() => {
    if (expandedDocId !== openedDocIdRef.current) {
      openedDocIdRef.current = undefined;
      setActiveCell(undefined);
    }
  }, [expandedDocId]);
  useEffect(() => {
    clickAbortRef.current?.abort();
    setActiveCell(undefined);
  }, [source]);

  // Opens the newest span of a clicked cell in Discover's document flyout, leaving the
  // query and the selection as they are. Without _id and _index Discover shows the span as
  // given, rather than looking it up in the current query, which may not read that metadata.
  const openExampleSpan = useCallback(
    async (cell: LatencyMapCell) => {
      if (!setExpandedDoc) return;
      clickAbortRef.current?.abort();
      const controller = new AbortController();
      clickAbortRef.current = controller;
      setActiveCell(cell);
      let rawResponse;
      try {
        ({ rawResponse } = await searchEsql(
          buildExampleSpanQuery({ indexPattern, filters: baseFilters, cell }),
          // One row of wide traces indices: without this every mapped field comes back null.
          { signal: controller.signal, dropNullColumns: true }
        ));
      } catch {
        // Without the span there is nothing to open; the view stays as it is.
        if (!controller.signal.aborted) setActiveCell(undefined);
        return;
      }
      if (controller.signal.aborted) return;
      const { columns, values } = rawResponse;
      const [firstRow] = values;
      if (!firstRow) {
        setActiveCell(undefined);
        return;
      }
      const row = Object.fromEntries(columns.map((column, i) => [column.name, firstRow[i]]));
      // With its real identity (METADATA _id, _index) the traces document profile
      // recognizes the record and the flyout can write a URL reference; the fallback id
      // keeps a span without metadata openable, shown as given. A reference is restored
      // through the Discover query itself, selection and all: a span outside the selection
      // could never come back that way, so it is opened without the identity to link to,
      // its fields (the index among them, for the profile) as they are.
      const restorable = !selection || isCellWithin(cell, selection);
      const { _id, _index, ...withoutIdentity } = row;
      const raw = (restorable ? row : withoutIdentity) as DataTableRecord['raw'];
      const id =
        restorable && typeof _id === 'string' && typeof _index === 'string'
          ? getDocId(raw)
          : `traceLatencyMapExampleSpan-${cell.from}-${cell.minDuration}`;
      openedDocIdRef.current = id;
      setExpandedDoc(
        { id, raw, flattened: row },
        // The traces Overview front and center, not the field table. The id is the traces
        // document profile's (discover traces_document_profile doc_viewer accessor); as a
        // package this cannot import it, and an unknown id just falls back to the default.
        { initialTabId: 'doc_view_obs_traces_overview' }
      );
    },
    [setExpandedDoc, indexPattern, baseFilters, searchEsql, selection]
  );

  if (!source) return null;

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="s"
      // The chart section can be resized smaller than the map; scroll rather than clip.
      css={css`
        position: relative;
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
        activeCell={activeCell}
        onFocusOperation={updateESQLQuery ? focusOperation : undefined}
        focusedOperation={focusedOperation}
        onClearOperation={updateESQLQuery ? clearOperation : undefined}
        // A committed selection rewrites the query; the line says the documents are following.
        isUpdating={isChartLoading}
        timeZone={timeZone}
      />
    </EuiPanel>
  );
}
