/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { encode, decode } from '@kbn/rison';
import { EventEmitter } from 'events';
import { parse, stringifyUrl } from 'query-string';
import { useCallback, useMemo, useRef, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { BehaviorSubject } from 'rxjs';
import { STATE_STORAGE_KEY } from '../../../../common/constants';
import { VisualizeRuntimeState } from '../../../react_embeddable/types';

import { VisualizeServices } from '../../types';
import { UpdateVisFn } from './use_embeddable_api_handler';

/**
 * This effect is responsible for instantiating the visualize app state container,
 * which is in sync with "_a" url param
 */
export const useVisualizeAppState = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  updateVis: UpdateVisFn | undefined
) => {
  const { history } = services;
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);
  const currentState = useMemo(() => {
    const searchParams = parse(history.location.search);
    const appState = searchParams[STATE_STORAGE_KEY];
    return typeof appState === 'string'
      ? (decode(appState) as unknown as VisualizeRuntimeState)
      : null;
  }, [history.location.search]);
  const state$ = useRef(new BehaviorSubject<VisualizeRuntimeState | null>(currentState));

  useEffectOnce(() => {
    const onDirtyStateChange = ({ isDirty }: { isDirty: boolean }) => {
      if (!isDirty) {
        //   // it is important to update vis state with fresh data
        //   stateContainer.transitions.updateVisState(visStateToEditorState(instance, services).vis);
        // }
        setHasUnappliedChanges(isDirty);
      }
    };

    eventEmitter.on('dirtyStateChange', onDirtyStateChange);
    return () => {
      eventEmitter.off('dirtyStateChange', onDirtyStateChange);
    };
  });

  const getState = useCallback(() => currentState, [currentState]);

  const updateUrlState = useCallback(
    (newState: VisualizeRuntimeState) => {
      state$.current.next(newState);
      const encodedState = encode(newState);
      const newUrl = stringifyUrl(
        {
          url: history.location.pathname,
          query: {
            ...parse(history.location.search),
            [STATE_STORAGE_KEY]: encodedState,
          },
        },
        { encode: false }
      );
      history.replace(newUrl);
    },
    [history]
  );

  const updateDataView = useCallback(
    async (dataViewId) => {
      if (!currentState || !updateVis) return;
      const newSerializedVis = {
        ...currentState.serializedVis,
      };
      const selectedDataView = await services.dataViews.get(dataViewId);
      Object.assign(newSerializedVis.data, {
        indexPattern: selectedDataView,
        searchSource: {
          ...newSerializedVis.data.searchSource,
          index: dataViewId,
          aggs: services.data.search.aggs.createAggConfigs(
            selectedDataView,
            newSerializedVis.data.aggs
          ),
        },
        savedSearchId: undefined,
      });
      updateVis(newSerializedVis);
    },
    [currentState, services, updateVis]
  );

  const updateTitle = useCallback(
    (newTitle: string) => {
      updateVis?.({ title: newTitle });
    },
    [updateVis]
  );

  return {
    stateContainer: {
      updateUrlState,
      getState,
      state$: state$.current,
      transitions: {
        updateDataView,
        updateTitle,
      },
    },
    currentAppState: currentState,
    hasUnappliedChanges,
  };
};
