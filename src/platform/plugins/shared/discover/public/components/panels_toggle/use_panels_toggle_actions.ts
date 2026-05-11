/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject } from 'rxjs';
import { setChartHidden, setTableHidden } from '@kbn/discover-utils';
import { useAppStateSelector } from '../../application/main/state_management/redux';
import type { SidebarToggleState } from '../../application/types';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../application/main/state_management/redux';
import { useDiscoverServices } from '../../hooks/use_discover_services';

interface UsePanelsToggleActionsParams {
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
}

export const usePanelsToggleActions = ({ sidebarToggleState$ }: UsePanelsToggleActionsParams) => {
  const { storage } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));
  const isTableHidden = useAppStateSelector((state) => Boolean(state.hideTable));
  const sidebarToggleState = useObservable(sidebarToggleState$, sidebarToggleState$.getValue());
  const isSidebarHidden = sidebarToggleState.isCollapsed;

  const setPanelVisibility = useCallback(
    ({ hideChart, hideTable }: { hideChart: boolean; hideTable: boolean }) => {
      setChartHidden(storage, 'discover', hideChart);
      setTableHidden(storage, 'discover', hideTable);
      dispatch(updateAppState({ appState: { hideChart, hideTable } }));
    },
    [dispatch, storage, updateAppState]
  );

  const toggleChart = useCallback(() => {
    const hideChart = !isChartHidden;
    const hideTable = hideChart && isTableHidden ? false : isTableHidden;

    setPanelVisibility({ hideChart, hideTable });
  }, [isChartHidden, isTableHidden, setPanelVisibility]);

  const toggleTable = useCallback(() => {
    const hideTable = !isTableHidden;
    const hideChart = hideTable && isChartHidden ? false : isChartHidden;

    setPanelVisibility({ hideChart, hideTable });
  }, [isChartHidden, isTableHidden, setPanelVisibility]);

  const toggleSidebar = useCallback(() => {
    sidebarToggleState.toggle?.(!isSidebarHidden);
  }, [isSidebarHidden, sidebarToggleState]);

  return {
    isChartHidden,
    isSidebarHidden,
    isTableHidden,
    toggleChart,
    toggleSidebar,
    toggleTable,
  };
};
