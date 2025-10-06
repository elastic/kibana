/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { ESQLEditorRestorableState } from '@kbn/esql-editor';
import type { DataViewPickerProps, UnifiedSearchDraft } from '@kbn/unified-search-plugin/public';
import { ControlGroupRenderer, type ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import { css } from '@emotion/react';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { useDiscoverCustomization } from '../../../../customizations';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useDiscoverTopNav } from './use_discover_topnav';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { useESQLVariables } from './use_esql_variables';
import { ESQLToDataViewTransitionModal } from './esql_dataview_transition';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabSelector,
  useDataViewsForPicker,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { onSaveDiscoverSession } from './save_discover_session';
import { DiscoverTopNavMenu } from './discover_topnav_menu';

export interface DiscoverTopNavProps {
  savedQuery?: string;
  stateContainer: DiscoverStateContainer;
  esqlModeErrors?: Error;
  esqlModeWarning?: string;
  onFieldEdited: () => Promise<void>;
  isLoading?: boolean;
  onCancelClick?: () => void;
}

export const DiscoverTopNav = ({
  savedQuery,
  stateContainer,
  esqlModeErrors,
  esqlModeWarning,
  onFieldEdited,
  isLoading,
  onCancelClick,
}: DiscoverTopNavProps) => {
  const dispatch = useInternalStateDispatch();
  const services = useDiscoverServices();
  const { dataViewEditor, navigation, dataViewFieldEditor, data } = services;
  const [controlGroupApi, setControlGroupApi] = useState<ControlGroupRendererApi | undefined>();

  const query = useAppStateSelector((state) => state.query);
  const esqlVariables = useCurrentTabSelector((tab) => tab.esqlVariables);

  const timeRange = useCurrentTabSelector((tab) => tab.dataRequestParams.timeRangeAbsolute);

  const { savedDataViews, adHocDataViews } = useDataViewsForPicker();
  const dataView = useCurrentDataView();
  const isESQLToDataViewTransitionModalVisible = useInternalStateSelector(
    (state) => state.isESQLToDataViewTransitionModalVisible
  );
  const tabsEnabled = services.discoverFeatureFlags.getTabsEnabled();
  const discoverSessionTitle = useInternalStateSelector(
    (state) => state.persistedDiscoverSession?.title
  );
  const isEsqlMode = useIsEsqlMode();
  const showDatePicker = useMemo(() => {
    // always show the timepicker for ES|QL mode
    return (
      isEsqlMode || (!isEsqlMode && dataView.isTimeBased() && dataView.type !== DataViewType.ROLLUP)
    );
  }, [dataView, isEsqlMode]);

  const closeFieldEditor = useRef<() => void | undefined>();

  // ES|QL controls logic
  const { onSaveControl, getActivePanels } = useESQLVariables({
    isEsqlMode,
    stateContainer,
    currentEsqlVariables: esqlVariables,
    controlGroupApi,
    onUpdateESQLQuery: stateContainer.actions.updateESQLQuery,
  });

  useEffect(() => {
    return () => {
      // Make sure to close the editors when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
    };
  }, []);

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) || !dataView.isPersisted();

  const editField = useMemo(
    () =>
      canEditDataView
        ? async (fieldName?: string) => {
            if (dataView?.id) {
              const dataViewInstance = await data.dataViews.get(dataView.id);
              closeFieldEditor.current = await dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: dataViewInstance,
                },
                fieldName,
                onSave: async () => {
                  await onFieldEdited();
                },
              });
            }
          }
        : undefined,
    [canEditDataView, dataView?.id, data.dataViews, dataViewFieldEditor, onFieldEdited]
  );

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField() : undefined),
    [editField, canEditDataView]
  );

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    const { appState } = stateContainer;
    if (newSavedQueryId) {
      appState.update({ savedQuery: newSavedQueryId });
    } else {
      // remove savedQueryId from state
      const newState = {
        ...appState.getState(),
      };
      delete newState.savedQuery;
      appState.set(newState);
    }
  };

  const onESQLToDataViewTransitionModalClose = useCallback(
    (shouldDismissModal?: boolean, needsSave?: boolean) => {
      if (shouldDismissModal) {
        services.storage.set(ESQL_TRANSITION_MODAL_KEY, true);
      }
      dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(false));
      // the user dismissed the modal, we don't need to save the search or switch to the data view mode
      if (needsSave == null) {
        return;
      }
      if (needsSave) {
        onSaveDiscoverSession({
          services,
          state: stateContainer,
          onClose: () =>
            dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(false)),
          onSaveCb: () => {
            stateContainer.actions.transitionFromESQLToDataView(dataView.id ?? '');
          },
        });
      } else {
        stateContainer.actions.transitionFromESQLToDataView(dataView.id ?? '');
      }
    },
    [dataView.id, dispatch, services, stateContainer]
  );

  const { topNavBadges, topNavMenu } = useDiscoverTopNav({ stateContainer });

  const dataViewPickerProps: DataViewPickerProps = useMemo(() => {
    return {
      trigger: {
        label: dataView?.getName() || '',
        'data-test-subj': 'discover-dataView-switch-link',
        title: dataView?.getIndexPattern() || '',
      },
      currentDataViewId: dataView?.id,
      onAddField: addField,
      onDataViewCreated: stateContainer.actions.onDataViewCreated,
      onCreateDefaultAdHocDataView: stateContainer.actions.createAndAppendAdHocDataView,
      onChangeDataView: stateContainer.actions.onChangeDataView,
      adHocDataViews,
      savedDataViews,
      onEditDataView: stateContainer.actions.onDataViewEdited,
    };
  }, [adHocDataViews, addField, dataView, savedDataViews, stateContainer]);

  const onESQLDocsFlyoutVisibilityChanged = useCallback((isOpen: boolean) => {
    if (isOpen) {
      dismissAllFlyoutsExceptFor(DiscoverFlyouts.esqlDocs);
    }
  }, []);

  const searchBarCustomization = useDiscoverCustomization('search_bar');

  const SearchBar = useMemo(
    () => searchBarCustomization?.CustomSearchBar ?? navigation.ui.AggregateQueryTopNavMenu,
    [searchBarCustomization?.CustomSearchBar, navigation.ui.AggregateQueryTopNavMenu]
  );

  const searchDraftUiState = useCurrentTabSelector((state) => state.uiState.searchDraft);
  const setSearchDraftUiState = useCurrentTabAction(internalStateActions.setSearchDraftUiState);
  const onSearchDraftChange = useCallback(
    (newSearchDraftUiState: UnifiedSearchDraft | undefined) => {
      dispatch(
        setSearchDraftUiState({
          searchDraftUiState: newSearchDraftUiState,
        })
      );
    },
    [dispatch, setSearchDraftUiState]
  );

  const esqlEditorUiState = useCurrentTabSelector((state) => state.uiState.esqlEditor);
  const setEsqlEditorUiState = useCurrentTabAction(internalStateActions.setESQLEditorUiState);
  const onEsqlEditorInitialStateChange = useCallback(
    (newEsqlEditorUiState: Partial<ESQLEditorRestorableState>) => {
      dispatch(
        setEsqlEditorUiState({
          esqlEditorUiState: newEsqlEditorUiState,
        })
      );
    },
    [dispatch, setEsqlEditorUiState]
  );

  const shouldHideDefaultDataviewPicker =
    !!searchBarCustomization?.CustomDataViewPicker || !!searchBarCustomization?.hideDataViewPicker;

  return (
    <span css={floatingActionStyles}>
      <DiscoverTopNavMenu topNavBadges={topNavBadges} topNavMenu={topNavMenu} />
      <SearchBar
        useBackgroundSearchButton={
          services.data.search.isBackgroundSearchEnabled &&
          !!services.capabilities.discover_v2.storeSearchSession
        }
        appName="discover"
        indexPatterns={[dataView]}
        onQuerySubmit={stateContainer.actions.onUpdateQuery}
        onCancel={onCancelClick}
        isLoading={isLoading}
        onSavedQueryIdChange={updateSavedQueryId}
        query={query}
        savedQueryId={savedQuery}
        screenTitle={discoverSessionTitle}
        showDatePicker={showDatePicker}
        allowSavingQueries
        showSearchBar={true}
        useDefaultBehaviors={true}
        dataViewPickerOverride={
          searchBarCustomization?.CustomDataViewPicker ? (
            <searchBarCustomization.CustomDataViewPicker />
          ) : undefined
        }
        dataViewPickerComponentProps={
          shouldHideDefaultDataviewPicker ? undefined : dataViewPickerProps
        }
        displayStyle="detached"
        textBasedLanguageModeErrors={esqlModeErrors ? [esqlModeErrors] : undefined}
        textBasedLanguageModeWarning={esqlModeWarning}
        prependFilterBar={
          searchBarCustomization?.PrependFilterBar ? (
            <searchBarCustomization.PrependFilterBar />
          ) : undefined
        }
        onESQLDocsFlyoutVisibilityChanged={onESQLDocsFlyoutVisibilityChanged}
        draft={searchDraftUiState}
        onDraftChange={tabsEnabled ? onSearchDraftChange : undefined}
        esqlEditorInitialState={esqlEditorUiState}
        onEsqlEditorInitialStateChange={onEsqlEditorInitialStateChange}
        esqlVariablesConfig={
          isEsqlMode
            ? {
                esqlVariables: esqlVariables ?? [],
                onSaveControl,
                controlsWrapper: (
                  <ControlGroupRenderer
                    onApiAvailable={setControlGroupApi}
                    timeRange={timeRange}
                    getCreationOptions={async (initialState) => {
                      const initialChildControlState =
                        getActivePanels() ?? initialState.initialChildControlState ?? {};
                      return {
                        initialState: {
                          ...initialState,
                          initialChildControlState,
                        },
                      };
                    }}
                    viewMode="edit"
                  />
                ),
              }
            : undefined
        }
      />
      {isESQLToDataViewTransitionModalVisible && (
        <ESQLToDataViewTransitionModal onClose={onESQLToDataViewTransitionModalClose} />
      )}
    </span>
  );
};

// ToDo: Remove when the new layout lands https://github.com/elastic/kibana/issues/234854
const floatingActionStyles = css({
  '.controlFrameFloatingActions': {
    top: '100%',
    transform: 'translate(0, -20%)',
    left: '-8px',
    right: 'auto',
  },
});
