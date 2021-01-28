/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { cloneDeep, isEqual } from 'lodash';
import { map } from 'rxjs/operators';
import { EventEmitter } from 'events';
import { i18n } from '@kbn/i18n';

import { MarkdownSimple, toMountPoint } from '../../../../../kibana_react/public';
import { migrateLegacyQuery } from '../migrate_legacy_query';
import { esFilters, connectToQueryState } from '../../../../../data/public';
import {
  VisualizeServices,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../../types';
import { visStateToEditorState } from '../utils';
import { createVisualizeAppState } from '../create_visualize_app_state';
import { VisualizeConstants } from '../../visualize_constants';
/**
 * This effect is responsible for instantiating the visualize app state container,
 * which is in sync with "_a" url param
 */
export const useVisualizeAppState = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  instance?: VisualizeEditorVisInstance
) => {
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);
  const [appState, setAppState] = useState<VisualizeAppStateContainer | null>(null);

  useEffect(() => {
    if (instance) {
      const stateDefaults = visStateToEditorState(instance, services);
      const byValue = !('savedVis' in instance);
      const { stateContainer, stopStateSync } = createVisualizeAppState({
        stateDefaults,
        kbnUrlStateStorage: services.kbnUrlStateStorage,
        byValue,
      });

      const onDirtyStateChange = ({ isDirty }: { isDirty: boolean }) => {
        if (!isDirty) {
          // it is important to update vis state with fresh data
          stateContainer.transitions.updateVisState(visStateToEditorState(instance, services).vis);
        }
        setHasUnappliedChanges(isDirty);
      };

      eventEmitter.on('dirtyStateChange', onDirtyStateChange);

      const { filterManager, queryString } = services.data.query;
      // sync initial app state from state to managers
      filterManager.setAppFilters(cloneDeep(stateContainer.getState().filters));
      queryString.setQuery(migrateLegacyQuery(stateContainer.getState().query));

      // setup syncing of app filters between appState and query services
      const stopSyncingAppFilters = connectToQueryState(
        services.data.query,
        {
          set: ({ filters, query }) => {
            stateContainer.transitions.set('filters', filters);
            stateContainer.transitions.set('query', query);
          },
          get: () => {
            return {
              filters: stateContainer.getState().filters,
              query: stateContainer.getState().query,
            };
          },
          state$: stateContainer.state$.pipe(
            map((state) => ({
              filters: state.filters,
              query: state.query,
            }))
          ),
        },
        {
          filters: esFilters.FilterStateStore.APP_STATE,
          query: true,
        }
      );

      // The savedVis is pulled from elasticsearch, but the appState is pulled from the url, with the
      // defaults applied. If the url was from a previous session which included modifications to the
      // appState then they won't be equal.
      if (!isEqual(stateContainer.getState().vis, stateDefaults.vis)) {
        const { aggs, ...visState } = stateContainer.getState().vis;
        instance.vis
          .setState({ ...visState, data: { aggs } })
          .then(() => {
            // setting up the stateContainer after setState is successful will prevent loading the editor with failures
            // otherwise the catch will take presedence
            setAppState(stateContainer);
          })
          .catch((error: Error) => {
            // if setting new vis state was failed for any reason,
            // redirect to the listing page with error message
            services.toastNotifications.addWarning({
              title: i18n.translate('visualize.visualizationLoadingFailedErrorMessage', {
                defaultMessage: 'Failed to load the visualization',
              }),
              text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
            });

            services.history.replace(
              `${VisualizeConstants.LANDING_PAGE_PATH}?notFound=visualization`
            );
          });
      } else {
        setAppState(stateContainer);
      }

      // don't forget to clean up
      return () => {
        eventEmitter.off('dirtyStateChange', onDirtyStateChange);
        stopStateSync();
        stopSyncingAppFilters();
      };
    }
  }, [eventEmitter, instance, services]);

  return { appState, hasUnappliedChanges };
};
