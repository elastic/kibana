/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { useExpressionRenderer } from '@kbn/expressions-plugin/public';
import {
  apiHasExecutionContext,
  apiPublishesUnifiedSearch,
  fetch$,
  initializeTitles,
  useStateFromPublishingSubject,
  apiPublishesSettings,
  apiHasDisableTriggers,
} from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import React, { useRef } from 'react';
import { BehaviorSubject, merge } from 'rxjs';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../common/constants';
import { createVisAsync } from '../vis_async';
import { getExpressionRendererProps } from './get_expression_renderer_props';
import { MarkdownEditorApi, MarkdownEditorSerializedState } from './types';

export const visualizeEmbeddableFactory: ReactEmbeddableFactory<
  MarkdownEditorSerializedState,
  MarkdownEditorApi
> = {
  type: VISUALIZE_EMBEDDABLE_TYPE,
  deserializeState: (state) => {
    /**
     * Here we can run clientside migrations and inject references.
     */
    return state.rawState as MarkdownEditorSerializedState;
  },
  /**
   * The buildEmbeddable function is async so you can async import the component or load a saved
   * object here. The loading will be handed gracefully by the Presentation Container.
   */
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    /**
     * initialize state (source of truth)
     */
    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
    const visFromState = state.savedVis ?? {
      ...state.vis,
      type: state.vis.type.name,
    };
    const vis = await createVisAsync(visFromState.type, visFromState);

    const vis$ = new BehaviorSubject(vis);
    const expressionParams$ = new BehaviorSubject<
      | {
          expression: ExpressionAstExpression;
        }
      | {}
    >({});
    const expressionAbortController$ = new BehaviorSubject<AbortController>(new AbortController());
    const executionContext = apiHasExecutionContext(parentApi)
      ? parentApi.executionContext
      : undefined;
    const disableTriggers = apiHasDisableTriggers(parentApi)
      ? parentApi.disableTriggers
      : undefined;

    /**
     * Register the API for this embeddable. This API will be published into the imperative handle
     * of the React component. Methods on this API will be exposed to siblings, to registered actions
     * and to the parent api.
     */
    const api = buildApi(
      {
        ...titlesApi,
        serializeState: () => {
          return {
            rawState: {
              ...serializeTitles(),
              vis: vis$.getValue(),
            },
          };
        },
      },

      /**
       * Provide state comparators. Each comparator is 3 element tuple:
       * 1) current value (publishing subject)
       * 2) setter, allowing parent to reset value
       * 3) optional comparator which provides logic to diff lasted stored value and current value
       */
      {
        vis: [
          vis$,
          (value) =>
            vis$.next({
              ...value,
              title: value.title || state.title || value.type.name,
            }),
        ],
        ...titleComparators,
      }
    );
    fetch$(api).subscribe(async (data) => {
      const unifiedSearch = apiPublishesUnifiedSearch(parentApi)
        ? {
            query: data.query,
            filters: data.filters,
            timeRange: data.timeRange,
          }
        : {};
      const searchSessionId = apiPublishesSearchSession(parentApi) ? data.searchSessionId : '';
      const currentVis = vis$.getValue();
      const settings = apiPublishesSettings(parentApi)
        ? {
            syncColors: parentApi.settings.syncColors$.getValue(),
            syncCursor: parentApi.settings.syncCursor$.getValue(),
            syncTooltips: parentApi.settings.syncTooltips$.getValue(),
          }
        : {};

      if (!currentVis) return;
      const { params, abortController } = await getExpressionRendererProps({
        unifiedSearch,
        vis: currentVis,
        settings,
        disableTriggers,
        searchSessionId,
        parentExecutionContext: executionContext,
        abortController: expressionAbortController$.getValue(),
      });
      expressionParams$.next(params);
      expressionAbortController$.next(abortController);
    });

    return {
      api,
      Component: () => {
        // get state for rendering
        const expressionParams = useStateFromPublishingSubject(expressionParams$);
        const domNode = useRef<HTMLDivElement>(null);
        useExpressionRenderer(domNode, expressionParams);

        return (
          <div style={{ width: '100%' }} ref={domNode}>
            Loading
          </div>
        );
      },
    };
  },
};
