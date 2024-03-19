/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { css } from '@emotion/react';
import { CellActionsProvider } from '@kbn/cell-actions';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  initializeReactEmbeddableTitles,
  ReactEmbeddableFactory,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useClosestCompatibleApi } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  apiPublishesLocalUnifiedSearch,
  useBatchedPublishingSubjects,
  useClosestDataViewsSubject,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { DataLoadingState, UnifiedDataTable } from '@kbn/unified-data-table';
import React, { useEffect } from 'react';
import { EmbeddableExamplesStartDependencies } from '../../plugin';
import { apiPublishesSelectedFields } from '../field_list/publishes_selected_fields';
import { DATA_TABLE_ID } from './constants';
import { initializeDataTableQueries } from './data_table_queries';
import { DataTableApi, DataTableProvider, DataTableSerializedState } from './types';

export const isDataTableProvider = (api: unknown): api is DataTableProvider => {
  return apiPublishesDataViews(api) && apiPublishesSelectedFields(api);
};

export const registerDataTableFactory = (
  core: CoreStart,
  services: EmbeddableExamplesStartDependencies
) => {
  const discoverTableFactory: ReactEmbeddableFactory<DataTableSerializedState, DataTableApi> = {
    type: DATA_TABLE_ID,
    deserializeState: (state) => {
      return state.rawState as DataTableSerializedState;
    },
    buildEmbeddable: async (initialState, buildApi) => {
      // initialize embeddable state
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(initialState);

      // initialize required async services
      const promises = [
        services.dataViews.getDefault(),
        initializeDataTableQueries(services.data),
      ] as const;
      const [defaultDataView, dataTableQueryService] = await Promise.all(promises);
      if (!defaultDataView) {
        throw new Error(
          i18n.translate('embeddableExamples.dataTable.noDataViewError', {
            defaultMessage: 'No default data view available',
          })
        );
      }

      // initialize services
      const storage = new Storage(localStorage);
      const fullServices = {
        ...services,
        storage,
        theme: core.theme,
        uiSettings: core.uiSettings,
        toastNotifications: core.notifications.toasts,
      };

      const api = buildApi(
        {
          ...titlesApi,
          forceRefresh: dataTableQueryService.forceRefresh,
          dataLoading: dataTableQueryService.queryLoading$,
          serializeState: () => {
            return {
              rawState: serializeTitles(),
            };
          },
        },
        titleComparators
      );

      // Create the React Embeddable component
      return {
        api,
        Component: () => {
          // inherit state
          const dataViews$ = useClosestDataViewsSubject(api, defaultDataView);
          const unifiedSearchProvider = useClosestCompatibleApi(
            api,
            apiPublishesLocalUnifiedSearch
          );
          const fieldsProvider = useClosestCompatibleApi(api, apiPublishesSelectedFields);

          // start the query service.
          dataTableQueryService.setProviders(dataViews$, unifiedSearchProvider);

          // unwrap publishing subjects into reactive state
          const [inheritedFields, rows, loading, dataViews] = useBatchedPublishingSubjects(
            fieldsProvider?.selectedFields,
            dataTableQueryService.rows$,
            api.dataLoading,
            dataViews$
          );

          // run on destroy functions on unmount
          useEffect(() => {
            return () => {
              dataTableQueryService.onDestroy();
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
                <KibanaRenderContextProvider theme={core.theme} i18n={core.i18n}>
                  <KibanaContextProvider services={fullServices}>
                    <CellActionsProvider
                      getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
                    >
                      <UnifiedDataTable
                        sort={[]}
                        rows={rows}
                        showTimeCol={true}
                        onFilter={() => {}}
                        sampleSizeState={100}
                        useNewFieldsApi={true}
                        onSetColumns={() => {}}
                        dataView={dataViews[0]}
                        columns={inheritedFields ?? []}
                        ariaLabelledBy="dataTableReactEmbeddableAria"
                        loadingState={loading ? DataLoadingState.loading : DataLoadingState.loaded}
                        services={fullServices}
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
  };

  registerReactEmbeddableFactory(discoverTableFactory);
};
