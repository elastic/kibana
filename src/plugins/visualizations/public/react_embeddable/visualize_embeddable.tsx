/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { ExpressionRendererParams, useExpressionRenderer } from '@kbn/expressions-plugin/public';
import {
  apiHasDisableTriggers,
  apiHasExecutionContext,
  apiPublishesSettings,
  apiPublishesUnifiedSearch,
  fetch$,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { isEqual } from 'lodash';
import React, { useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../common/constants';
import type { Vis } from '../vis';
import { createVisAsync } from '../vis_async';
import { getExpressionRendererProps } from './get_expression_renderer_props';
import type { VisualizeApi, VisualizeSerializedState } from './types';

export const visualizeEmbeddableFactory: ReactEmbeddableFactory<
  VisualizeSerializedState,
  VisualizeApi
> = {
  type: VISUALIZE_EMBEDDABLE_TYPE,
  deserializeState: (state) => {
    return state.rawState as VisualizeSerializedState;
  },
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
    const vis = await createVisAsync(state.savedVis.type, state.savedVis);

    const id$ = new BehaviorSubject<string>(state.id);
    const vis$ = new BehaviorSubject<Vis>(vis);
    const savedVis$ = new BehaviorSubject(state.savedVis);
    const expressionParams$ = new BehaviorSubject<ExpressionRendererParams>({
      expression: '',
    });
    const expressionAbortController$ = new BehaviorSubject<AbortController>(new AbortController());
    const executionContext = apiHasExecutionContext(parentApi)
      ? parentApi.executionContext
      : undefined;
    const disableTriggers = apiHasDisableTriggers(parentApi)
      ? parentApi.disableTriggers
      : undefined;

    const api = buildApi(
      {
        ...titlesApi,
        serializeState: () => {
          return {
            rawState: {
              ...serializeTitles(),
              id: id$.getValue(),
              savedVis: vis$.getValue().serialize(),
            },
          };
        },
      },
      {
        ...titleComparators,
        id: [id$, (value) => id$.next(value)],
        savedVis: [
          savedVis$,
          async (value) => {
            savedVis$.next(value);
            vis$.next(await createVisAsync(value.type, value));
          },
          (a, b) => isEqual(a, b),
        ],
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
      const settings = apiPublishesSettings(parentApi)
        ? {
            syncColors: parentApi.settings.syncColors$.getValue(),
            syncCursor: parentApi.settings.syncCursor$.getValue(),
            syncTooltips: parentApi.settings.syncTooltips$.getValue(),
          }
        : {};

      const { params, abortController } = await getExpressionRendererProps({
        unifiedSearch,
        vis: vis$.getValue(),
        settings,
        disableTriggers,
        searchSessionId,
        parentExecutionContext: executionContext,
        abortController: expressionAbortController$.getValue(),
      });
      if (params) expressionParams$.next(params);
      expressionAbortController$.next(abortController);
    });

    return {
      api,
      Component: () => {
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
