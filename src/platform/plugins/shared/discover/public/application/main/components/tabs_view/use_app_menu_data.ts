/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useContext, useMemo, useState } from 'react';
import type { EuiResizeObserverProps } from '@elastic/eui';
import type { UnifiedTabsProps, TabMenuItem } from '@kbn/unified-tabs';
import useObservable from 'react-use/lib/useObservable';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { discoverTopNavMenuContext } from '../top_nav/discover_topnav_menu';
import {
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
  useCurrentTabAction,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';

const APP_MENU_COLLAPSE_THRESHOLD = 800;

interface UseAppMenuDataParams {
  currentDataView: DataView | undefined;
}

interface UseAppMenuDataResult {
  shouldCollapseAppMenu: boolean;
  onResize: EuiResizeObserverProps['onResize'];
  getAdditionalTabMenuItems: UnifiedTabsProps['getAdditionalTabMenuItems'];
  topNavMenuItems: AppMenuConfig;
}

export const useAppMenuData = ({ currentDataView }: UseAppMenuDataParams): UseAppMenuDataResult => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const isEsqlMode = useIsEsqlMode();
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const [shouldCollapseAppMenu, setShouldCollapseAppMenu] = useState(false);

  const transitionFromESQLToDataView = useCurrentTabAction(
    internalStateActions.transitionFromESQLToDataView
  );

  // Determine if we should show the ES|QL to Data View transition modal
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const shouldShowESQLToDataViewTransitionModal =
    !persistedDiscoverSession || unsavedTabIds.includes(currentTabId);

  const onResize: EuiResizeObserverProps['onResize'] = useCallback((dimensions) => {
    if (!dimensions) return;
    setShouldCollapseAppMenu(dimensions.width < APP_MENU_COLLAPSE_THRESHOLD);
  }, []);

  // Provide "Switch to Classic" menu item for tabs when in ES|QL mode
  const getAdditionalTabMenuItems: UnifiedTabsProps['getAdditionalTabMenuItems'] = useMemo(() => {
    if (!isEsqlMode || !services.uiSettings.get(ENABLE_ESQL)) {
      return undefined;
    }

    return (): TabMenuItem[] => [
      {
        'data-test-subj': 'unifiedTabs_tabMenuItem_switchToClassic',
        name: 'switchToClassic',
        label: i18n.translate('discover.localMenu.switchToClassicTitle', {
          defaultMessage: 'Switch to classic',
        }),
        onClick: () => {
          services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:back_to_classic_clicked`);
          if (
            shouldShowESQLToDataViewTransitionModal &&
            !services.storage.get(ESQL_TRANSITION_MODAL_KEY)
          ) {
            dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(true));
          } else {
            dispatch(transitionFromESQLToDataView({ dataViewId: currentDataView?.id ?? '' }));
          }
        },
      },
    ];
  }, [
    isEsqlMode,
    services,
    shouldShowESQLToDataViewTransitionModal,
    dispatch,
    transitionFromESQLToDataView,
    currentDataView,
  ]);

  const { topNavMenu$ } = useContext(discoverTopNavMenuContext);
  const topNavMenuItems = useObservable(topNavMenu$, topNavMenu$.getValue());

  return {
    shouldCollapseAppMenu,
    onResize,
    getAdditionalTabMenuItems,
    topNavMenuItems: topNavMenuItems as AppMenuConfig,
  };
};
