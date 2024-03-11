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
import {
  DataViewsPublicPluginStart,
  DATA_VIEW_SAVED_OBJECT_TYPE,
  type DataView,
} from '@kbn/data-views-plugin/public';
import {
  initializeReactEmbeddableTitles,
  initializeReactEmbeddableUuid,
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
  useReactEmbeddableApiHandle,
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { LazyDataViewPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
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

export const registerFieldListFactory = (
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
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState) as FieldListSerializedStateState;
      // inject the reference
      const dataViewIdRef = state.references?.find(
        (ref) => ref.name === FIELD_LIST_DATA_VIEW_REF_NAME
      );
      if (dataViewIdRef && serializedState) {
        serializedState.dataViewId = dataViewIdRef?.id;
      }
      return serializedState;
    },
    getComponent: async (initialState, maybeId) => {
      const uuid = initializeReactEmbeddableUuid(maybeId);
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(initialState);

      const allDataViews = await dataViews.getIdsWithTitle();

      const selectedDataViewId$ = new BehaviorSubject<string | undefined>(
        initialState.dataViewId ?? (await dataViews.getDefaultDataView())?.id
      );
      const selectedFieldNames$ = new BehaviorSubject<string[] | undefined>(
        initialState.selectedFieldNames
      );

      return RegisterReactEmbeddable((apiRef) => {
        const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
          uuid,
          fieldListEmbeddableFactory,
          {
            dataViewId: [selectedDataViewId$, (value) => selectedDataViewId$.next(value)],
            selectedFieldNames: [
              selectedFieldNames$,
              (value) => selectedFieldNames$.next(value),
              (a, b) => {
                return (a?.slice().sort().join(',') ?? '') === (b?.slice().sort().join(',') ?? '');
              },
            ],
            ...titleComparators,
          }
        );

        useReactEmbeddableApiHandle(
          {
            ...titlesApi,
            unsavedChanges,
            resetUnsavedChanges,
            serializeState: async () => {
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
          apiRef,
          uuid
        );

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
      });
    },
  };

  registerReactEmbeddableFactory(FIELD_LIST_ID, fieldListEmbeddableFactory);
};
