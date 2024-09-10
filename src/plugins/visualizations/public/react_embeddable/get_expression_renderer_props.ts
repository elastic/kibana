/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { ExpressionRendererEvent, ExpressionRendererParams } from '@kbn/expressions-plugin/public';
import { toExpressionAst } from '../embeddable/to_ast';
import { getExecutionContext, getTimeFilter } from '../services';
import type { VisParams } from '../types';
import type { Vis } from '../vis';

interface GetExpressionRendererPropsParams {
  unifiedSearch: {
    filters?: Filter[];
    query?: Query | AggregateQuery;
  };
  timeRange?: TimeRange;
  disableTriggers?: boolean;
  settings: {
    syncColors?: boolean;
    syncCursor?: boolean;
    syncTooltips?: boolean;
  };
  parentExecutionContext?: KibanaExecutionContext;
  searchSessionId?: string;
  abortController?: AbortController;
  vis: Vis<VisParams>;
  timeslice?: [number, number];
  onRender: (renderCount: number) => void;
  onEvent: (event: ExpressionRendererEvent) => void;
  onData: ExpressionRendererParams['onData$'];
}

export const getExpressionRendererProps: (params: GetExpressionRendererPropsParams) => Promise<{
  abortController: AbortController;
  params: ExpressionRendererParams | null;
}> = async ({
  unifiedSearch: { query, filters },
  settings: { syncColors = true, syncCursor = true, syncTooltips = false },
  disableTriggers = false,
  parentExecutionContext,
  searchSessionId,
  vis,
  abortController,
  timeRange,
  onRender,
  onEvent,
  onData,
}) => {
  const parentContext = parentExecutionContext ?? getExecutionContext().get();
  const childContext: KibanaExecutionContext = {
    type: 'agg_based',
    name: vis.type.name,
    id: vis.id ?? 'new',
    description: vis.title,
  };

  const executionContext = {
    ...parentContext,
    childContext,
  };

  const timefilter = getTimeFilter();
  const expressionVariables = await vis.type.getExpressionVariables?.(vis, timefilter);
  const inspectorAdapters = vis.type.inspectorAdapters
    ? typeof vis.type.inspectorAdapters === 'function'
      ? vis.type.inspectorAdapters()
      : vis.type.inspectorAdapters
    : undefined;
  const loaderParams = {
    searchContext: {
      timeRange,
      query,
      filters,
      disableWarningToasts: true,
    },
    variables: {
      embeddableTitle: vis.title,
      ...expressionVariables,
    },
    searchSessionId,
    syncColors,
    syncTooltips,
    syncCursor,
    uiState: vis.uiState,
    interactive: !disableTriggers,
    inspectorAdapters,
    executionContext,
    onRender$: onRender,
    onData$: onData,
    onEvent,
  };

  if (abortController) {
    abortController.abort();
  }

  const newAbortController = new AbortController();

  const expression = await toExpressionAst(vis, {
    timefilter,
    timeRange,
    abortSignal: newAbortController.signal,
  });
  if (!newAbortController.signal.aborted) {
    return {
      params: { expression, ...loaderParams } as ExpressionRendererParams,
      abortController: newAbortController,
    };
  }

  return { params: null, abortController: newAbortController };
};
