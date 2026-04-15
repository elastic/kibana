/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { css } from '@emotion/react';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  initializeUnsavedChanges,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { DataLoadingState, UnifiedDataTable } from '@kbn/unified-data-table';
import React, { useEffect } from 'react';
import { BehaviorSubject, merge } from 'rxjs';
import type { StartDeps } from '../../plugin';
import { DATA_TABLE_ID } from './constants';
import { initializeDataTableQueries } from './data_table_queries';
import type { DataTableApi, DataTableSerializedState } from './types';

export const getDataTableFactory = (
  core: CoreStart,
  services: StartDeps
): EmbeddableFactory<DataTableSerializedState, DataTableApi> => ({
  type: DATA_TABLE_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const state = initialState;
    const timeRangeManager = initializeTimeRangeManager(state);
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const titleManager = initializeTitleManager(state);

    const storage = new Storage(localStorage);
    const allServices: UnifiedDataTableProps['services'] = {
      ...services,
      storage,
      theme: core.theme,
      uiSettings: core.uiSettings,
      toastNotifications: core.notifications.toasts,
    };

    const serializeState = () => {
      return {
        ...titleManager.getLatestState(),
        ...timeRangeManager.getLatestState(),
      };
    };

    const unsavedChangesApi = initializeUnsavedChanges<DataTableSerializedState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(titleManager.anyStateChange$, timeRangeManager.anyStateChange$),
      getComparators: () => {
        return {
          ...titleComparators,
          ...timeRangeComparators,
        };
      },
      onReset: (lastSaved) => {
        timeRangeManager.reinitializeState(lastSaved);
        titleManager.reinitializeState(lastSaved);
      },
    });

    const api = finalizeApi({
      ...timeRangeManager.api,
      ...titleManager.api,
      ...unsavedChangesApi,
      dataLoading$,
      serializeState,
    });

    const queryService = await initializeDataTableQueries(services, api, dataLoading$);

    // Create the React Embeddable component
    return {
      api,
      Component: () => {
        // unwrap publishing subjects into reactive state
        const [fields, rows, loading, dataView] = useBatchedPublishingSubjects(
          queryService.fields$,
          queryService.rows$,
          dataLoading$,
          queryService.dataView$
        );

        // stop query service on unmount
        useEffect(() => {
          return () => {
            queryService.stop();
          };
        }, []);

        return (
          <>
            <EuiScreenReaderOnly>
              <span id="dataTableReactEmbeddableAria">
                {i18n.translate('embeddableExamples.dataTable.ariaLabel', {
                  defaultMessage: 'Data table',
                })}
              </span>
            </EuiScreenReaderOnly>
            <div
              css={css`
                width: 100%;
              `}
            >
              <KibanaRenderContextProvider {...core}>
                <KibanaContextProvider services={allServices}>
                  <CellActionsProvider
                    getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
                  >
                    <UnifiedDataTable
                      sort={[]}
                      rows={rows}
                      showTimeCol={true}
                      onFilter={() => {}}
                      dataView={dataView}
                      sampleSizeState={100}
                      columns={fields ?? []}
                      services={allServices}
                      onSetColumns={() => {}}
                      ariaLabelledBy="dataTableReactEmbeddableAria"
                      loadingState={loading ? DataLoadingState.loading : DataLoadingState.loaded}
                    />
                  </CellActionsProvider>
                </KibanaContextProvider>
              </KibanaRenderContextProvider>
            </div>
          </>
        );
      },
    };
  },
});
