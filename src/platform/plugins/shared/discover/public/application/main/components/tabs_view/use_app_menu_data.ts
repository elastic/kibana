/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import type { EuiResizeObserverProps } from '@elastic/eui';
import type { UnifiedTabsProps } from '@kbn/unified-tabs';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
  useCurrentTabAction,
  selectAllTabs,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import { useTopNavMenuItems } from '../top_nav/use_top_nav_menu_items';
import { isDataViewSource } from '../../../../../common/data_sources';

const APP_MENU_COLLAPSE_THRESHOLD = 800;

interface UseAppMenuDataParams {
  currentDataView: DataView | undefined;
}

interface UseAppMenuDataResult {
  shouldCollapseAppMenu: boolean;
  onResize: EuiResizeObserverProps['onResize'];
  getAdditionalTabMenuItems: UnifiedTabsProps['getAdditionalTabMenuItems'];
  topNavMenuItems: AppMenuConfig | undefined;
}

export const useAppMenuData = ({ currentDataView }: UseAppMenuDataParams): UseAppMenuDataResult => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const allTabs = useInternalStateSelector(selectAllTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const [shouldCollapseAppMenu, setShouldCollapseAppMenu] = useState(false);

  const transitionFromDataViewToESQL = useCurrentTabAction(
    internalStateActions.transitionFromDataViewToESQL
  );
  const transitionFromESQLToDataView = useCurrentTabAction(
    internalStateActions.transitionFromESQLToDataView
  );
  const setCommentUiState = useCurrentTabAction(internalStateActions.setCommentUiState);

  const onResize: EuiResizeObserverProps['onResize'] = useCallback((dimensions) => {
    if (!dimensions) return;
    setShouldCollapseAppMenu(dimensions.width < APP_MENU_COLLAPSE_THRESHOLD);
  }, []);

  // Provide "Switch to ES|QL" and "Switch to Classic" menu items for the selected tab
  const getAdditionalTabMenuItems = useCallback<
    NonNullable<UnifiedTabsProps['getAdditionalTabMenuItems']>
  >(
    (item) => {
      const tab = allTabs.find((t) => t.id === item.id);
      const isCurrentTab = tab?.id === currentTabId;
      const items: Array<{
        'data-test-subj': string;
        name: string;
        label: string;
        onClick: () => void;
      }> = [];

      if (services.uiSettings.get(ENABLE_ESQL) && isCurrentTab && tab && currentDataView) {
        if (isDataViewSource(tab.appState.dataSource)) {
          items.push({
            'data-test-subj': 'unifiedTabs_tabMenuItem_switchToESQL',
            name: 'switchToESQL',
            label: i18n.translate('discover.localMenu.switchToESQLTitle', {
              defaultMessage: 'Switch to ES|QL',
            }),
            onClick: () => {
              services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:try_btn_clicked`);
              dispatch(transitionFromDataViewToESQL({ dataView: currentDataView }));
            },
          });
        } else {
          items.push({
            'data-test-subj': 'unifiedTabs_tabMenuItem_switchToClassic',
            name: 'switchToClassic',
            label: i18n.translate('discover.localMenu.switchToClassicTitle', {
              defaultMessage: 'Switch to classic',
            }),
            onClick: () => {
              services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:back_to_classic_clicked`);
              const shouldShowESQLToDataViewTransitionModal =
                !persistedDiscoverSession || unsavedTabIds.includes(tab.id);
              if (
                shouldShowESQLToDataViewTransitionModal &&
                !services.storage.get(ESQL_TRANSITION_MODAL_KEY)
              ) {
                dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(true));
              } else {
                dispatch(transitionFromESQLToDataView({ dataViewId: currentDataView.id ?? '' }));
              }
            },
          });
        }
      }

      if (isCurrentTab && tab) {
        const hasComment = typeof tab.uiState.comment === 'string';
        items.push({
          'data-test-subj': hasComment
            ? 'unifiedTabs_tabMenuItem_removeComment'
            : 'unifiedTabs_tabMenuItem_addComment',
          name: hasComment ? 'removeComment' : 'addComment',
          label: hasComment
            ? i18n.translate('discover.tabs.removeCommentMenuItem', {
                defaultMessage: 'Remove comment',
              })
            : i18n.translate('discover.tabs.addCommentMenuItem', {
                defaultMessage: 'Add comment',
              }),
          onClick: () => {
            dispatch(setCommentUiState({ comment: hasComment ? undefined : '' }));
          },
        });
      }

      return items;
    },
    [
      allTabs,
      currentDataView,
      currentTabId,
      dispatch,
      persistedDiscoverSession,
      services,
      transitionFromDataViewToESQL,
      transitionFromESQLToDataView,
      setCommentUiState,
      unsavedTabIds,
    ]
  );

  const topNavMenuItems = useTopNavMenuItems();

  return {
    shouldCollapseAppMenu,
    onResize,
    getAdditionalTabMenuItems,
    topNavMenuItems,
  };
};
