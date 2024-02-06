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
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart, type DataView } from '@kbn/data-views-plugin/public';
import {
  DefaultEmbeddableApi,
  initializeReactEmbeddableTitles,
  initializeReactEmbeddableUuid,
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
  SerializedReactEmbeddableTitles,
  useReactEmbeddableApiHandle,
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { LazyDataViewPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import { IncompatibleActionError, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import React, { useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

const DataViewPicker = withSuspense(LazyDataViewPicker, null);

type FieldListSerializedStateState = SerializedReactEmbeddableTitles & {
  dataViewId?: string;
  selectedFieldNames?: string[];
};

type FieldListApi = DefaultEmbeddableApi;

const UNIFIED_FIELD_LIST_ID = 'unified_field_list';
const ADD_UNIFIED_FIELD_LIST_ID_ACTION_ID = 'create_unified_field_list';

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
    uiActions,
    data,
    charts,
    fieldFormats,
  }: {
    dataViews: DataViewsPublicPluginStart;
    uiActions: UiActionsStart;
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
      return state.rawState as FieldListSerializedStateState;
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
              return {
                rawState: {
                  ...serializeTitles(),
                  dataViewId: selectedDataViewId$.getValue(),
                  selectedFieldNames: selectedFieldNames$.getValue(),
                },
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

  registerReactEmbeddableFactory(UNIFIED_FIELD_LIST_ID, fieldListEmbeddableFactory);

  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_UNIFIED_FIELD_LIST_ID_ACTION_ID,
    getIconType: () => 'indexOpen',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel({
        panelType: UNIFIED_FIELD_LIST_ID,
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.unifiedFieldList.displayName', {
        defaultMessage: 'Field list',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_UNIFIED_FIELD_LIST_ID_ACTION_ID);
};
