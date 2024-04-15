/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import { CellActionsProvider } from '@kbn/cell-actions';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_EMBEDDABLE_TYPE,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_FIELD_STATISTICS,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import {
  FetchContext,
  initializeTitles,
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';

import { extract, inject } from '../../../common/embeddable/search_inject_extract';
import { FieldStatisticsTable } from '../../application/main/components/field_stats_table';
import { getValidViewMode } from '../../application/main/utils/get_valid_view_mode';
import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';
import { DiscoverServices } from '../../build_services';
import { getSortForEmbeddable } from '../../utils';
import { getAllowedSampleSize } from '../../utils/get_allowed_sample_size';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '../constants';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import { SavedSearchEmbeddableComponent } from '../saved_search_embeddable_component';
import { SearchEmbeddableApi, SearchEmbeddableSerializedState, SearchProps } from '../types';
import { updateSearchSource } from '../utils/update_search_source';
import { initializeFetch } from './initialize_fetch';
import { DataTableRecord } from '@kbn/discover-utils/types';

export const getSearchEmbeddableFactory = ({
  startServices,
  discoverServices,
}: {
  startServices: {
    executeTriggerActions: (triggerId: string, context: object) => Promise<void>;
    isEditable: () => boolean;
  };
  discoverServices: DiscoverServices;
}) => {
  const { attributeService } = discoverServices.savedSearch.byValue;

  const savedSearchEmbeddableFactory: ReactEmbeddableFactory<
    SearchEmbeddableSerializedState,
    SearchEmbeddableApi
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      if (!state.rawState) return {};
      const serializedState = state.rawState as EmbeddableStateWithType;
      const deserializedState = inject(serializedState, state.references ?? []);
      return deserializedState;
    },
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);

      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const rows$ = new BehaviorSubject<DataTableRecord[]>([]);
      const {
        onUnmount,
        searchEmbeddableApi,
        searchEmbeddableComparators,
        serializeSearchEmbeddable,
      } = await initializeSearchEmbeddableApi(initialState, { startServices, discoverServices });

      const serializeState = (): SerializedPanelState<SearchEmbeddableSerializedState> => {
        const { state: rawState, references } = extract({
          type: SEARCH_EMBEDDABLE_TYPE,
          ...serializeTitles(),
          ...serializeSearchEmbeddable(),
        } as unknown as EmbeddableStateWithType);
        return {
          rawState: rawState as unknown as SearchEmbeddableSerializedState,
          references,
        };
      };

      const api = buildApi(
        {
          ...titlesApi,
          ...searchEmbeddableApi,
          dataLoading: dataLoading$,
          blockingError: blockingError$,
          rows: rows$,
          getSavedSearch: () => {
            return undefined;
          },
          canLinkToLibrary: async () => {
            // const { visualize } = coreServices.application.capabilities;
            return !Boolean(searchEmbeddableApi.savedObjectId$.getValue());
          },
          canUnlinkFromLibrary: async () => Boolean(searchEmbeddableApi.savedObjectId$.getValue()),
          saveToLibrary: async (title: string) => {
            const savedObjectId = await attributeService.saveMethod({
              ...searchEmbeddableApi.attributes$.getValue(),
              title,
            });
            return savedObjectId;
          },
          getByReferenceState: (savedObjectId: string) => {
            return {
              savedObjectId,
            };
          },
          checkForDuplicateTitle: (newTitle, isTitleDuplicateConfirmed, onTitleDuplicate) =>
            attributeService.checkForDuplicateTitle({
              newTitle,
              isTitleDuplicateConfirmed,
              onTitleDuplicate,
            }),
          getByValueState: () => {
            const { savedObjectId, ...byValueState } = serializeState().rawState ?? {};
            return {
              ...byValueState,
              attributes: searchEmbeddableApi.attributes$.getValue(),
            };
          },
          serializeState,
        },
        {
          ...titleComparators,
          ...searchEmbeddableComparators,
        }
      );

      const initialSavedSearch = searchEmbeddableApi.savedSearch$.getValue();
      const unsubscribeFromFetch = initializeFetch({
        api,
        discoverServices,
        savedSearch: initialSavedSearch,
      });

      return {
        api,
        Component: () => {
          const [savedSearch, rows] = useBatchedPublishingSubjects(
            searchEmbeddableApi.savedSearch$,
            api.rows
          );
          console.log('rows', rows);

          useEffect(() => {
            return () => {
              console.log('on unmount');
              onUnmount();
              unsubscribeFromFetch();
            };
          }, []);

          const { dataView, columns, query, filters, viewMode } = useMemo(() => {
            const searchSourceQuery = savedSearch.searchSource.getField('query');
            return {
              dataView: savedSearch.searchSource.getField('index'),
              columns: savedSearch.columns ?? [],
              query: searchSourceQuery, // inherited query?
              filters: savedSearch.searchSource.getField('filter') as Filter[], // inherited filters?
              viewMode: getValidViewMode({
                viewMode: savedSearch.viewMode,
                isTextBasedQueryMode: isTextBasedQuery(searchSourceQuery),
              }),
            };
          }, [savedSearch]);

          const searchProps: SearchProps = useMemo(() => {
            // const query = savedSearch.searchSource.getField('query');
            // const isTextBasedQueryMode = isTextBasedQuery(query);
            return {
              services: discoverServices,
              columns,
              savedSearchId: savedSearch.id,
              // query: savedSearch.searchSource.getField('query'),
              filters,
              dataView,
              isLoading: false,
              sort: getSortForEmbeddable(
                savedSearch,
                savedSearch.sort,
                discoverServices.uiSettings
              ),
              rows,
              searchDescription: savedSearch.description,
              description: savedSearch.description,
              // inspectorAdapters: this.inspectorAdapters,
              searchTitle: savedSearch.title,
              onAddColumn: (columnName: string) => {
                console.log('onAddColumn');
                // if (!props.columns) {
                //   return;
                // }
                // const updatedColumns = columnActions.addColumn(props.columns, columnName, true);
                // this.updateInput({ columns: updatedColumns });
              },
              onRemoveColumn: (columnName: string) => {
                console.log('onRemoveColumn');

                // if (!props.columns) {
                //   return;
                // }
                // const updatedColumns = columnActions.removeColumn(props.columns, columnName, true);
                // this.updateInput({ columns: updatedColumns });
              },
              onMoveColumn: (columnName: string, newIndex: number) => {
                console.log('onMoveColumn');

                // if (!props.columns) {
                //   return;
                // }
                // const columns = columnActions.moveColumn(props.columns, columnName, newIndex);
                // this.updateInput({ columns });
              },
              onSetColumns: (columns: string[]) => {
                console.log('onSetColumn');
                // this.updateInput({ columns });
              },
              onSort: (nextSort: string[][]) => {
                console.log('onSort');
                // const sortOrderArr: SortOrder[] = [];
                // nextSort.forEach((arr) => {
                //   sortOrderArr.push(arr as SortOrder);
                // });
                // this.updateInput({ sort: sortOrderArr });
              },
              onFilter: async (field, value, operator) => {
                console.log('onFilter');
                // let filters = generateFilters(
                //   this.services.filterManager,
                //   // @ts-expect-error
                //   field,
                //   value,
                //   operator,
                //   dataView
                // );
                // filters = filters.map((filter) => ({
                //   ...filter,
                //   $state: { store: FilterStateStore.APP_STATE },
                // }));

                // await this.executeTriggerActions(APPLY_FILTER_TRIGGER, {
                //   embeddable: this,
                //   filters,
                // });
              },
              useNewFieldsApi: !discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false),
              showTimeCol: !discoverServices.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
              ariaLabelledBy: 'documentsAriaLabel',
              // rowHeightState: this.input.rowHeight || savedSearch.rowHeight,
              rowHeightState: savedSearch.rowHeight,
              onUpdateRowHeight: (rowHeight) => {
                console.log('onUpdateRowHeight');
                // this.updateInput({ rowHeight });
              },
              // headerRowHeightState: this.input.headerRowHeight || savedSearch.headerRowHeight,
              headerRowHeightState: savedSearch.headerRowHeight,
              onUpdateHeaderRowHeight: (headerRowHeight) => {
                console.log('onUpdateHeaderRowHeight');
                // this.updateInput({ headerRowHeight });
              },
              // rowsPerPageState: this.input.rowsPerPage || savedSearch.rowsPerPage,
              rowsPerPageState: savedSearch.rowsPerPage,
              onUpdateRowsPerPage: (rowsPerPage) => {
                console.log('onUpdateRowsPerPage');
                // this.updateInput({ rowsPerPage });
              },
              // sampleSizeState: this.input.sampleSize || savedSearch.sampleSize,
              sampleSizeState: savedSearch.sampleSize,
              onUpdateSampleSize: (sampleSize) => {
                console.log('onUpdateSampleSize');
                // this.updateInput({ sampleSize });
              },
              cellActionsTriggerId: SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID,
            };
          }, [savedSearch, dataView, columns, filters, rows]);

          if (
            discoverServices.uiSettings.get(SHOW_FIELD_STATISTICS) === true &&
            viewMode === VIEW_MODE.AGGREGATED_LEVEL &&
            dataView &&
            Array.isArray(columns)
          ) {
            return (
              <KibanaContextProvider services={discoverServices}>
                <FieldStatisticsTable
                  dataView={dataView}
                  columns={columns}
                  savedSearch={savedSearch}
                  filters={filters}
                  query={query}
                  onAddFilter={() => {
                    console.log('on add filter');
                  }}
                  // searchSessionId={this.input.searchSessionId}
                />
              </KibanaContextProvider>
            );
          } else {
            const props = {
              savedSearch,
              searchProps,
              // useLegacyTable,
              query,
            };

            return (
              <KibanaContextProvider services={discoverServices}>
                <CellActionsProvider
                  getTriggerCompatibleActions={(triggerId, context) => Promise.resolve([])}
                >
                  <SavedSearchEmbeddableComponent
                    {...props}
                    useLegacyTable={false}
                    fetchedSampleSize={getAllowedSampleSize(
                      searchProps.sampleSizeState,
                      discoverServices.uiSettings
                    )}
                  />
                </CellActionsProvider>
              </KibanaContextProvider>
            );
          }
        },
      };
    },
  };

  return savedSearchEmbeddableFactory;
};
