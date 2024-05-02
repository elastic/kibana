/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import {
  apiHasExecutionContext,
  apiPublishesUnifiedSearch,
  fetch$,
  initializeTitles,
  useInheritedViewMode,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import React, { useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../common/constants';
import { createVisAsync } from '../vis_async';
import { MarkdownEditorApi, MarkdownEditorSerializedState } from './types';
import { useExpressionHandler } from './use_expression_handler';

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
    const searchSessionId$ = new BehaviorSubject<string | null>(undefined);
    const unifiedSearch$ = new BehaviorSubject<{
      timeRange: TimeRange;
      query: Query;
      filter: Filter;
    }>(undefined);
    const executionContext = apiHasExecutionContext(parentApi)
      ? parentApi.executionContext
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

    fetch$(api).subscribe((data) => {
      if (apiPublishesUnifiedSearch(parentApi)) {
        unifiedSearch$.next({
          query: data.query,
          filters: data.filters,
          timeRange: data.timeRange,
        });
      }
      if (apiPublishesSearchSession(parentApi)) {
        searchSessionId$.next(data.searchSessionId);
      }
    });
    return {
      api,
      Component: () => {
        // get state for rendering
        const currentVis = useStateFromPublishingSubject(vis$);
        const viewMode = useInheritedViewMode(api) ?? 'view';
        const nodeRef = useRef<HTMLDivElement>(null);
        const unifiedSearch = useStateFromPublishingSubject(unifiedSearch$);
        const searchSessionId = useStateFromPublishingSubject(searchSessionId$);

        const expressionHandler = useExpressionHandler({
          domNode: nodeRef.current,
          viewMode,
          vis: currentVis,
          unifiedSearch,
          searchSessionId,
          parentExecutionContext: executionContext,
        });

        return (
          <div
            ref={nodeRef}
            data-description={currentVis.description}
            data-test-subj="reactVisualizeEmbeddableContainer"
          >
            {JSON.stringify(currentVis)}
          </div>
        );
      },
    };
  },
};
