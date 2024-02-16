/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { css } from '@emotion/react';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { getUnifiedDataTable } from '@kbn/discover-plugin/public';
import {
  initializeReactEmbeddableTitles,
  initializeReactEmbeddableUuid,
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
  useReactEmbeddableApiHandle,
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { useClosestCompatibleApi } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  apiPublishesLocalUnifiedSearch,
  useBatchedPublishingSubjects,
  useClosestDataViewsSubject,
} from '@kbn/presentation-publishing';
import { DataLoadingState } from '@kbn/unified-data-table';
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
    deserializeState: (state) => {
      return state.rawState as DataTableSerializedState;
    },
    getComponent: async (initialState, maybeId) => {
      // initialize embeddable state
      const uuid = initializeReactEmbeddableUuid(maybeId);
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(initialState);

      // initialize required async services
      const promises = [
        getUnifiedDataTable(),
        services.dataViews.getDefault(),
        initializeDataTableQueries(services.data),
      ] as const;
      const [DataTable, defaultDataView, dataTableQueryService] = await Promise.all(promises);
      if (!defaultDataView) {
        throw new Error(
          i18n.translate('embeddableExamples.dataTable.noDataViewError', {
            defaultMessage: 'No default data view available',
          })
        );
      }

      // Create the React Embeddable component
      return RegisterReactEmbeddable((apiRef) => {
        const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
          uuid,
          discoverTableFactory,
          titleComparators
        );

        // publish this embeddable's API.
        const thisApi = useReactEmbeddableApiHandle(
          {
            type: DATA_TABLE_ID,
            ...titlesApi,
            unsavedChanges,
            forceRefresh: dataTableQueryService.forceRefresh,
            dataLoading: dataTableQueryService.queryLoading$,
            resetUnsavedChanges,
            serializeState: async () => {
              return {
                rawState: serializeTitles(),
              };
            },
          },
          apiRef,
          uuid
        );

        // inherit state
        const dataViews$ = useClosestDataViewsSubject(thisApi, defaultDataView);
        const unifiedSearchProvider = useClosestCompatibleApi(
          thisApi,
          apiPublishesLocalUnifiedSearch
        );
        const fieldsProvider = useClosestCompatibleApi(thisApi, apiPublishesSelectedFields);

        // start the query service.
        dataTableQueryService.setProviders(dataViews$, unifiedSearchProvider);

        // unwrap publishing subjects into reactive state
        const [inheritedFields, rows, loading, dataViews] = useBatchedPublishingSubjects(
          fieldsProvider?.selectedFields,
          dataTableQueryService.rows$,
          thisApi.dataLoading,
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
              <DataTable
                ariaLabelledBy="dataTableReactEmbeddableAria"
                columns={inheritedFields ?? []}
                dataView={dataViews[0]}
                onFilter={() => {}}
                onSetColumns={() => {}}
                loadingState={loading ? DataLoadingState.loading : DataLoadingState.loaded}
                showTimeCol={true}
                useNewFieldsApi={true}
                sort={[]}
                rows={rows}
                sampleSizeState={100}
              />
            </div>
          </>
        );
      });
    },
  };
  registerReactEmbeddableFactory(DATA_TABLE_ID, discoverTableFactory);
};
