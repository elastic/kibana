/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import { EventEmitter } from 'events';

import {
  VisualizeServices,
  VisualizeAppState,
  VisualizeAppStateContainer,
  IEditorController,
  VisualizeEditorVisInstance,
} from '../../types';

export const useEditorUpdates = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  setHasUnsavedChanges: (value: boolean) => void,
  appState: VisualizeAppStateContainer | null,
  visInstance: VisualizeEditorVisInstance | undefined,
  visEditorController: IEditorController | undefined
) => {
  const [isEmbeddableRendered, setIsEmbeddableRendered] = useState(false);
  const [currentAppState, setCurrentAppState] = useState<VisualizeAppState>();

  useEffect(() => {
    if (appState && visInstance) {
      const {
        timefilter: { timefilter },
        filterManager,
        queryString,
        state$,
      } = services.data.query;
      const { embeddableHandler, savedSearch, vis } = visInstance;
      const savedVis = 'savedVis' in visInstance ? visInstance.savedVis : undefined;
      const initialState = appState.getState();
      setCurrentAppState(initialState);

      const reloadVisualization = () => {
        if (visEditorController) {
          visEditorController.render({
            core: services,
            data: services.data,
            uiState: vis.uiState,
            timeRange: timefilter.getTime(),
            filters: filterManager.getFilters(),
            query: queryString.getQuery(),
            linked: !!vis.data.savedSearchId,
            savedSearch,
          });
        } else {
          embeddableHandler.updateInput({
            timeRange: timefilter.getTime(),
            filters: filterManager.getFilters(),
            query: queryString.getQuery(),
          });
        }
      };

      const subscriptions = state$.subscribe({
        next: reloadVisualization,
        error: services.fatalErrors.add,
      });

      const handleLinkedSearch = (linked: boolean) => {
        if (linked && savedVis && !savedVis.savedSearchId && savedSearch) {
          savedVis.savedSearchId = savedSearch.id;
          vis.data.savedSearchId = savedSearch.id;
          if (vis.data.searchSource) {
            vis.data.searchSource.setParent(savedSearch.searchSource);
          }
        } else if (!linked && savedVis && savedVis.savedSearchId) {
          delete savedVis.savedSearchId;
          delete vis.data.savedSearchId;
        } else if (!linked && !savedVis) {
          // delete link when it's not a saved vis
          delete vis.data.savedSearchId;
        }
      };

      // update persisted state from initial state
      if (initialState.uiState) {
        vis.uiState.setSilent(initialState.uiState);
      }

      // update the appState when the stateful instance changes
      const updateOnChange = () => {
        appState.transitions.set('uiState', vis.uiState.getChanges());
      };

      vis.uiState.on('change', updateOnChange);

      const unsubscribeStateUpdates = appState.subscribe((state) => {
        setCurrentAppState(state);
        if (savedVis && savedVis.id && !services.history.location.pathname.includes(savedVis.id)) {
          // this filters out the case when manipulating the browser history back/forward
          // and initializing different visualizations
          return;
        }

        if (!isEqual(state.uiState, vis.uiState.getChanges())) {
          vis.uiState.set(state.uiState);
        }

        // if the browser history was changed manually we need to reflect changes in the editor
        if (
          savedVis &&
          !isEqual(
            {
              ...services.visualizations.convertFromSerializedVis(vis.serialize()).visState,
              title: vis.title,
            },
            state.vis
          )
        ) {
          const { aggs, ...visState } = state.vis;
          vis.setState({
            ...visState,
            data: {
              aggs,
            },
          });
          embeddableHandler.reload();
          eventEmitter.emit('updateEditor');
        }

        handleLinkedSearch(state.linked);

        if (vis.data.searchSource) {
          vis.data.searchSource.setField('query', state.query);
          vis.data.searchSource.setField('filter', state.filters);
        }
        reloadVisualization();
        setHasUnsavedChanges(true);
      });

      const updateOnEmbeddableRendered = () => setIsEmbeddableRendered(true);
      eventEmitter.on('embeddableRendered', updateOnEmbeddableRendered);

      reloadVisualization();

      return () => {
        setIsEmbeddableRendered(false);
        eventEmitter.off('embeddableRendered', updateOnEmbeddableRendered);
        subscriptions.unsubscribe();
        vis.uiState.off('change', updateOnChange);
        unsubscribeStateUpdates();
      };
    }
  }, [appState, eventEmitter, visInstance, services, setHasUnsavedChanges, visEditorController]);

  return { isEmbeddableRendered, currentAppState };
};
