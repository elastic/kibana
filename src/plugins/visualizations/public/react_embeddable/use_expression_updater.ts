/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useState } from 'react';
import { getExecutionContext, getTimeFilter } from '../services';
import { toExpressionAst } from '../embeddable/to_ast';
import { useExecutionContext } from './use_execution_context';

export const useExpressionUpdater = ({
  unifiedSearch: { timeRange, query, filters },
  parentExecutionContext,
  searchSessionId,
  vis,
}) => {
  const [storedAbortController, setStoredAbortController] = useState<AbortController | null>(null);
  const executionContext = useExecutionContext(vis, parentExecutionContext);

  return useCallback(
    async (expressionHandler) => {
      if (expressionHandler) {
        console.log('EXECUTION CONTEXT', executionContext);
        const timefilter = getTimeFilter();
        const expressionVariables = await vis.type.getExpressionVariables?.(vis, timefilter);
        const expressionParams = {
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
          // syncColors: this.input.syncColors,
          // syncTooltips: this.input.syncTooltips,
          // syncCursor: this.input.syncCursor,
          uiState: vis.uiState,
          // interactive: !this.input.disableTriggers,
          // inspectorAdapters: this.inspectorAdapters,
          executionContext,
        };

        if (storedAbortController) {
          storedAbortController.abort();
        }

        const abortController = new AbortController();
        setStoredAbortController(abortController);

        try {
          const expression = await toExpressionAst(vis, {
            timefilter,
            timeRange,
            abortSignal: abortController.signal,
          });
          console.log('EXPRESSION', expression);
          if (!abortController.signal.aborted) {
            console.log('CALL UPDATE');
            await expressionHandler.update(expression, expressionParams);
          }
        } catch (e) {
          // this.onContainerError(e);
        }
      }
    },
    [vis, timeRange, query, filters, executionContext, searchSessionId, storedAbortController]
  );
};
