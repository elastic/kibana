/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiResizeObserver, EuiText, EuiTourStep } from '@elastic/eui';
import { UnifiedTabs, type UnifiedTabsProps } from '@kbn/unified-tabs';
import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { SingleTabView, type SingleTabViewProps } from '../single_tab_view';
import {
  createTabItem,
  internalStateActions,
  selectAllTabs,
  selectRecentlyClosedTabs,
  selectIsTabsBarHidden,
  useInternalStateDispatch,
  useInternalStateSelector,
  useCurrentTabRuntimeState,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY } from '../../../../../common/constants';
import { usePreviewData } from './use_preview_data';
import { useAppMenuData } from './use_app_menu_data';

const MAX_TABS_COUNT = 25;

export const TabsView = (props: SingleTabViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const items = useInternalStateSelector(selectAllTabs);
  const recentlyClosedItems = useInternalStateSelector(selectRecentlyClosedTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);
  const hideTabsBar = useInternalStateSelector(selectIsTabsBarHidden);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const currentDataView = useCurrentTabRuntimeState(
    props.runtimeStateManager,
    (tab) => tab.currentDataView$
  );

  const scopedEbtManager = useCurrentTabRuntimeState(
    props.runtimeStateManager,
    (state) => state.scopedEbtManager$
  );

  const { shouldCollapseAppMenu, onResize, getAdditionalTabMenuItems, topNavMenuItems } =
    useAppMenuData({ currentDataView });

  const [isSwitchModesCalloutDismissed, setIsSwitchModesCalloutDismissed] = useState(() =>
    Boolean(services.storage.get(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY))
  );

  const onCloseTourPermanently = useCallback(() => {
    services.storage.set(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY, true);
    setIsSwitchModesCalloutDismissed(true);
  }, [services.storage]);

  const onClosePopoverOnly = useCallback(() => {
    setIsTourStepOpen(false);
  }, []);

  const shouldShowSwitchModesTour =
    services.uiSettings.get(ENABLE_ESQL) &&
    !isSwitchModesCalloutDismissed &&
    !hideTabsBar &&
    !!currentTabId;

  const [isTourStepOpen, setIsTourStepOpen] = useState(false);

  useEffect(() => {
    if (!shouldShowSwitchModesTour) {
      setIsTourStepOpen(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsTourStepOpen(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [shouldShowSwitchModesTour, currentTabId]);

  const onEvent: UnifiedTabsProps['onEBTEvent'] = useCallback(
    (event) => {
      void scopedEbtManager.trackTabsEvent(event);
    },
    [scopedEbtManager]
  );

  const onChanged: UnifiedTabsProps['onChanged'] = useCallback(
    (updateState) => dispatch(internalStateActions.updateTabs(updateState)),
    [dispatch]
  );

  const onClearRecentlyClosed: UnifiedTabsProps['onClearRecentlyClosed'] = useCallback(
    () => dispatch(internalStateActions.clearRecentlyClosedTabs()),
    [dispatch]
  );

  const createItem: UnifiedTabsProps['createItem'] = useCallback(
    () => createTabItem(items),
    [items]
  );

  const renderContent: UnifiedTabsProps['renderContent'] = useCallback(
    () => <SingleTabView key={currentTabId} {...props} />,
    [currentTabId, props]
  );

  return (
    <>
      {shouldShowSwitchModesTour && (
        <EuiTourStep
          key={currentTabId}
          anchor={`[data-test-subj="unifiedTabs_tabMenuBtn_${currentTabId}"]`}
          anchorPosition="leftUp"
          step={1}
          stepsTotal={1}
          isStepOpen={isTourStepOpen}
          onFinish={onCloseTourPermanently}
          closePopover={onClosePopoverOnly}
          title={i18n.translate('discover.tabsView.switchModesCalloutTitle', {
            defaultMessage: 'Switch modes per tab',
          })}
          content={
            <EuiText size="s">
              <p>
                {i18n.translate('discover.tabsView.switchModesCalloutDescription', {
                  defaultMessage:
                    'Use the tab menu (⋯) on each tab to switch between Classic and ES|QL.',
                })}
              </p>
            </EuiText>
          }
          footerAction={
            <EuiButtonEmpty
              size="xs"
              flush="right"
              color="text"
              data-test-subj="discoverTabMenuSwitchModesTourClose"
              onClick={onCloseTourPermanently}
            >
              {i18n.translate('discover.tabsView.switchModesTourClose', {
                defaultMessage: 'Close tour',
              })}
            </EuiButtonEmpty>
          }
          data-test-subj="discoverTabMenuSwitchModesCallout"
        />
      )}
      {/**
       * AppMenuComponent handles responsiveness on its own, however, there are some edge cases e.g opening push flyout
       * where this might not be good enough.
       */}
      <EuiResizeObserver onResize={onResize}>
        {(resizeRef) => (
          <div ref={resizeRef}>
            <UnifiedTabs
              services={services}
              items={items}
              selectedItemId={currentTabId}
              recentlyClosedItems={recentlyClosedItems}
              unsavedItemIds={unsavedTabIds}
              maxItemsCount={MAX_TABS_COUNT}
              hideTabsBar={hideTabsBar}
              createItem={createItem}
              getPreviewData={getPreviewData}
              renderContent={renderContent}
              onChanged={onChanged}
              onEBTEvent={onEvent}
              onClearRecentlyClosed={onClearRecentlyClosed}
              getAdditionalTabMenuItems={getAdditionalTabMenuItems}
              appendRight={
                <AppMenuComponent config={topNavMenuItems} isCollapsed={shouldCollapseAppMenu} />
              }
            />
          </div>
        )}
      </EuiResizeObserver>
    </>
  );
};
