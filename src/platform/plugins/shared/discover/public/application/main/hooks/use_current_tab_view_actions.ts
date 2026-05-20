/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../common/constants';
import { isDataViewSource } from '../../../../common/data_sources';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useInspector } from './use_inspector';
import {
  internalStateActions,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../state_management/redux';

interface UseCurrentTabViewActionsParams {
  currentDataView: DataView | undefined;
  displayedRows?: DataTableRecord[];
}

export const useCurrentTabViewActions = ({
  currentDataView,
  displayedRows,
}: UseCurrentTabViewActionsParams) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const currentTab = useCurrentTabSelector((tab) => tab);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const transitionFromDataViewToESQL = useCurrentTabAction(
    internalStateActions.transitionFromDataViewToESQL
  );
  const transitionFromESQLToDataView = useCurrentTabAction(
    internalStateActions.transitionFromESQLToDataView
  );
  const setExpandedDoc = useCurrentTabAction(internalStateActions.setExpandedDoc);
  const openInspector = useInspector({ inspector: services.inspector });

  const isEsqlEnabled = services.uiSettings.get(ENABLE_ESQL);
  const isDataViewMode = isDataViewSource(currentTab.appState.dataSource);
  const canSwitchLanguageMode = Boolean(currentDataView) && isEsqlEnabled;
  const isDocumentDetailsOpen = Boolean(currentTab.expandedDoc);
  const firstDisplayedRow = displayedRows?.[0];
  const canToggleDocumentDetails = Boolean(currentTab.expandedDoc || firstDisplayedRow);

  const switchLanguageMode = useCallback(() => {
    if (!currentDataView || !isEsqlEnabled) {
      return;
    }

    if (isDataViewMode) {
      services.trackUiMetric?.(METRIC_TYPE.CLICK, 'esql:try_btn_clicked');
      dispatch(transitionFromDataViewToESQL({ dataView: currentDataView }));
      return;
    }

    services.trackUiMetric?.(METRIC_TYPE.CLICK, 'esql:back_to_classic_clicked');

    const shouldShowESQLToDataViewTransitionModal =
      !persistedDiscoverSession || unsavedTabIds.includes(currentTab.id);

    if (
      shouldShowESQLToDataViewTransitionModal &&
      !services.storage.get(ESQL_TRANSITION_MODAL_KEY)
    ) {
      dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(true));
    } else {
      dispatch(transitionFromESQLToDataView({ dataViewId: currentDataView.id ?? '' }));
    }
  }, [
    currentDataView,
    currentTab.id,
    dispatch,
    isDataViewMode,
    isEsqlEnabled,
    persistedDiscoverSession,
    services,
    transitionFromDataViewToESQL,
    transitionFromESQLToDataView,
    unsavedTabIds,
  ]);

  const toggleDocumentDetails = useCallback(() => {
    if (currentTab.expandedDoc) {
      dispatch(setExpandedDoc({ expandedDoc: undefined }));
    } else if (firstDisplayedRow) {
      dispatch(setExpandedDoc({ expandedDoc: firstDisplayedRow }));
    }
  }, [currentTab.expandedDoc, dispatch, firstDisplayedRow, setExpandedDoc]);

  return {
    canToggleDocumentDetails,
    canSwitchLanguageMode,
    isDataViewMode,
    isDocumentDetailsOpen,
    openInspector,
    switchLanguageMode,
    toggleDocumentDetails,
  };
};
