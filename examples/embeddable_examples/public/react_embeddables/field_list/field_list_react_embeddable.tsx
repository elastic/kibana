/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { Reference } from '@kbn/content-management-utils';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  DataViewsPublicPluginStart,
  DATA_VIEW_SAVED_OBJECT_TYPE,
} from '@kbn/data-views-plugin/public';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { i18n } from '@kbn/i18n';
import { initializeTitles, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { LazyDataViewPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { BehaviorSubject, Subscription } from 'rxjs';
import { FIELD_LIST_DATA_VIEW_REF_NAME, FIELD_LIST_ID } from './constants';
import { FieldListApi, FieldListSerializedStateState } from './types';

const DataViewPicker = withSuspense(LazyDataViewPicker, null);

const getCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] = () => {
  return {
    originatingApp: '',
    localStorageKeyPrefix: 'examples',
    timeRangeUpdatesType: 'timefilter',
    compressed: true,
    showSidebarToggleButton: false,
    disablePopularFields: true,
  };
};

export const getFieldListFactory = (
  core: CoreStart,
  {
    dataViews,
    data,
    charts,
    fieldFormats,
  }: {
    dataViews: DataViewsPublicPluginStart;
    data: DataPublicPluginStart;
    charts: ChartsPluginStart;
    fieldFormats: FieldFormatsStart;
  }
) => {
  const fieldListEmbeddableFactory: ReactEmbeddableFactory<
    FieldListSerializedStateState,
    FieldListApi
  > = {
    type: FIELD_LIST_ID,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState) as FieldListSerializedStateState;
      // inject the reference
      const dataViewIdRef = state.references?.find(
        (ref) => ref.name === FIELD_LIST_DATA_VIEW_REF_NAME
      );
      // if the serializedState already contains a dataViewId, we don't want to overwrite it. (Unsaved state can cause this)
      if (dataViewIdRef && serializedState && !serializedState.dataViewId) {
        serializedState.dataViewId = dataViewIdRef?.id;
      }
      return serializedState;
    },
    buildEmbeddable: async (initialState, buildApi) => {
      const subscriptions = new Subscription();
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);

      const allDataViews = await dataViews.getIdsWithTitle();
      const selectedDataViewId$ = new BehaviorSubject<string | undefined>(
        initialState.dataViewId ?? (await dataViews.getDefaultDataView())?.id
      );

      // transform data view ID into data views array.
      const getDataViews = async (id?: string) => {
        return id ? [await dataViews.get(id)] : undefined;
      };
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
        await getDataViews(initialState.dataViewId)
      );
      subscriptions.add(
        selectedDataViewId$.subscribe(async (id) => dataViews$.next(await getDataViews(id)))
      );

      const selectedFieldNames$ = new BehaviorSubject<string[] | undefined>(
        initialState.selectedFieldNames
      );

      const api = buildApi(
        {
          ...titlesApi,
          serializeState: () => {
            const dataViewId = selectedDataViewId$.getValue();
            const references: Reference[] = dataViewId
              ? [
                  {
                    type: DATA_VIEW_SAVED_OBJECT_TYPE,
                    name: FIELD_LIST_DATA_VIEW_REF_NAME,
                    id: dataViewId,
                  },
                ]
              : [];
            return {
              rawState: {
                ...serializeTitles(),
                // here we skip serializing the dataViewId, because the reference contains that information.
                selectedFieldNames: selectedFieldNames$.getValue(),
              },
              references,
            };
          },
        },
        {
          ...titleComparators,
          dataViewId: [selectedDataViewId$, (value) => selectedDataViewId$.next(value)],
          selectedFieldNames: [
            selectedFieldNames$,
            (value) => selectedFieldNames$.next(value),
            (a, b) => {
              return (a?.slice().sort().join(',') ?? '') === (b?.slice().sort().join(',') ?? '');
            },
          ],
        }
      );

      return {
        api,
        Component: () => {
          const [selectedDataViewId, selectedFieldNames] = useBatchedPublishingSubjects(
            selectedDataViewId$,
            selectedFieldNames$
          );

          const [selectedDataView, setSelectedDataView] = useState<DataView | undefined>(undefined);

          useEffect(() => {
            if (!selectedDataViewId) return;
            let mounted = true;
            (async () => {
              const dataView = await dataViews.get(selectedDataViewId);
              if (!mounted) return;
              setSelectedDataView(dataView);
            })();
            return () => {
              mounted = false;
            };
          }, [selectedDataViewId]);

          // On destroy
          useEffect(() => {
            return () => {
              subscriptions.unsubscribe();
            };
          }, []);

          return (
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem
                grow={false}
                css={css`
                  padding: ${euiThemeVars.euiSizeS};
                `}
              >
                <DataViewPicker
                  dataViews={allDataViews}
                  selectedDataViewId={selectedDataViewId}
                  onChangeDataViewId={(nextSelection) => {
                    selectedDataViewId$.next(nextSelection);
                  }}
                  trigger={{
                    label:
                      selectedDataView?.getName() ??
                      i18n.translate('embeddableExamples.unifiedFieldList.selectDataViewMessage', {
                        defaultMessage: 'Please select a data view',
                      }),
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                {selectedDataView ? (
                  <UnifiedFieldListSidebarContainer
                    fullWidth={true}
                    variant="list-always"
                    dataView={selectedDataView}
                    allFields={selectedDataView.fields}
                    getCreationOptions={getCreationOptions}
                    workspaceSelectedFieldNames={selectedFieldNames}
                    services={{ dataViews, data, fieldFormats, charts, core }}
                    onAddFieldToWorkspace={(field) =>
                      selectedFieldNames$.next([
                        ...(selectedFieldNames$.getValue() ?? []),
                        field.name,
                      ])
                    }
                    onRemoveFieldFromWorkspace={(field) => {
                      selectedFieldNames$.next(
                        (selectedFieldNames$.getValue() ?? []).filter((name) => name !== field.name)
                      );
                    }}
                  />
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      };
    },
  };
  return fieldListEmbeddableFactory;
};
