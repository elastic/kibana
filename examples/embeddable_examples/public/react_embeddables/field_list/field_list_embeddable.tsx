/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { type DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  type WithAllKeys,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
  initializeUnsavedChanges,
} from '@kbn/presentation-publishing';
import { LazyDataViewPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import React, { useEffect } from 'react';
import { merge, skip, Subscription, switchMap } from 'rxjs';
import { FIELD_LIST_ID } from './constants';
import type {
  FieldListApi,
  Services,
  FieldListSerializedState,
  FieldListRuntimeState,
} from './types';

const DataViewPicker = withSuspense(LazyDataViewPicker, null);

const defaultFieldListState: WithAllKeys<FieldListRuntimeState> = {
  dataViewId: undefined,
  selectedFieldNames: undefined,
  dataViews: undefined,
};

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

const deserializeState = async (
  dataViews: DataViewsPublicPluginStart,
  serializedState?: FieldListSerializedState
): Promise<FieldListRuntimeState> => {
  const [allDataViews, defaultDataViewId] = await Promise.all([
    dataViews.getIdsWithTitle(),
    dataViews.getDefaultId(),
  ]);
  if (!defaultDataViewId || allDataViews.length === 0) {
    throw new Error(
      i18n.translate('embeddableExamples.unifiedFieldList.noDefaultDataViewErrorMessage', {
        defaultMessage: 'The field list must be used with at least one Data View present',
      })
    );
  }
  const initialDataViewId = serializedState?.dataViewId ?? defaultDataViewId;
  const initialDataView = await dataViews.get(initialDataViewId);
  return {
    dataViewId: initialDataViewId,
    selectedFieldNames: serializedState?.selectedFieldNames ?? [],
    dataViews: [initialDataView],
  };
};

export const getFieldListFactory = (
  core: CoreStart,
  { dataViews, data, charts, fieldFormats }: Services
) => {
  const fieldListEmbeddableFactory: EmbeddableFactory<FieldListSerializedState, FieldListApi> = {
    type: FIELD_LIST_ID,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const state = await deserializeState(dataViews, initialState);
      const allDataViews = await dataViews.getIdsWithTitle();
      const subscriptions = new Subscription();
      const titleManager = initializeTitleManager(initialState ?? {});
      const fieldListStateManager = initializeStateManager(state, defaultFieldListState);

      // Whenever the data view changes, we want to update the data views and reset the selectedFields in the field list state manager.
      subscriptions.add(
        fieldListStateManager.api.dataViewId$
          .pipe(
            skip(1),
            switchMap((dataViewId) =>
              dataViewId ? dataViews.get(dataViewId) : dataViews.getDefaultDataView()
            )
          )
          .subscribe((nextSelectedDataView) => {
            fieldListStateManager.api.setDataViews(
              nextSelectedDataView ? [nextSelectedDataView] : undefined
            );
            fieldListStateManager.api.setSelectedFieldNames([]);
          })
      );

      function serializeState() {
        const { dataViews: selectedDataViews, ...rest } = fieldListStateManager.getLatestState();
        return {
          ...titleManager.getLatestState(),
          ...rest,
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, fieldListStateManager.anyStateChange$),
        getComparators: () => ({
          ...titleComparators,
          selectedFieldNames: (a, b) => {
            return (a?.slice().sort().join(',') ?? '') === (b?.slice().sort().join(',') ?? '');
          },
          dataViewId: 'referenceEquality',
        }),
        onReset: async (lastSaved) => {
          const lastState = await deserializeState(dataViews, lastSaved);
          fieldListStateManager.reinitializeState(lastState);
          titleManager.reinitializeState(lastSaved);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        serializeState,
      });

      return {
        api,
        Component: () => {
          const [selectedFieldNames, renderDataViews] = useBatchedPublishingSubjects(
            fieldListStateManager.api.selectedFieldNames$,
            fieldListStateManager.api.dataViews$
          );
          const { euiTheme } = useEuiTheme();

          const selectedDataView = renderDataViews?.[0];

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
                  padding: ${euiTheme.size.s};
                `}
              >
                <DataViewPicker
                  dataViews={allDataViews}
                  selectedDataViewId={selectedDataView?.id}
                  onChangeDataViewId={(nextSelection) =>
                    fieldListStateManager.api.setDataViewId(nextSelection)
                  }
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
                      fieldListStateManager.api.setSelectedFieldNames([
                        ...(selectedFieldNames ?? []),
                        field.name,
                      ])
                    }
                    onRemoveFieldFromWorkspace={(field) => {
                      fieldListStateManager.api.setSelectedFieldNames(
                        (selectedFieldNames ?? []).filter((name) => name !== field.name)
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
