/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { getExpressions } from '../services';
import { useExecutionContext } from './use_execution_context';
import { useExpressionUpdater } from './use_expression_updater';

export const useExpressionHandler = async ({
  domNode,
  viewMode,
  vis,
  unifiedSearch,
  searchSessionId,
  parentExecutionContext,
}) => {
  const [expressionHandler, setExpressionHandler] = useState(null);
  const expressions = useMemo(() => getExpressions(), []);
  const executionContext = useExecutionContext(vis, parentExecutionContext);

  const updateExpressionHandler = useExpressionUpdater({
    unifiedSearch,
    searchSessionId,
    vis,
    parentExecutionContext,
  });

  useEffect(() => {
    if (!domNode || expressionHandler) return;

    (async () => {
      const handler = await expressions.loader(domNode, undefined, {
        renderMode: viewMode || 'view',
        onRenderError: (element: HTMLElement, error: ExpressionRenderError) => {
          // this.onContainerError(error);
        },
        executionContext,
      });
      setExpressionHandler(handler);
      handler.loading$.subscribe((...args) => {
        console.log('LOADING', args);
      });
      handler.data$.subscribe((...args) => {
        console.log('DATA', args);
      });
      handler.render$.subscribe((...args) => {
        console.log('RENDER', args);
      });
      updateExpressionHandler(handler);
    })();
  }, [
    domNode,
    viewMode,
    expressions,
    expressionHandler,
    executionContext,
    updateExpressionHandler,
  ]);
  return expressionHandler;
};
