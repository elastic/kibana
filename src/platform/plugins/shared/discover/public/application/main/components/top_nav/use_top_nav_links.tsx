/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL, getInitialESQLQuery } from '@kbn/esql-utils';
import {
  AppMenuRegistry,
  type AppMenuItemPrimary,
  type AppMenuItemSecondary,
} from '@kbn/discover-utils';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import type { RuleTypeWithDescription } from '@kbn/alerts-ui-shared';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import useObservable from 'react-use/lib/useObservable';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import type { AppMenuDiscoverParams } from './app_menu_actions';
import {
  getAlertsAppMenuItem,
  getNewSearchAppMenuItem,
  getOpenSearchAppMenuItem,
  getShareAppMenuItem,
  getInspectAppMenuItem,
  getBackgroundSearchFlyout,
} from './app_menu_actions';
import type { TopNavCustomization } from '../../../../customizations';
import { useProfileAccessor } from '../../../../context_awareness';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
import type { DiscoverAppLocatorParams } from '../../../../../common';
import type { DiscoverAppState } from '../../state_management/redux';
import { onSaveDiscoverSession } from './save_discover_session';
import { useDataState } from '../../hooks/use_data_state';

/**
 * Helper function to build the top nav links
 */
export const useTopNavLinks = ({
  dataView,
  services,
  state,
  onOpenInspector,
  hasUnsavedChanges,
  isEsqlMode,
  adHocDataViews,
  topNavCustomization,
  shouldShowESQLToDataViewTransitionModal,
  hasShareIntegration,
  persistedDiscoverSession,
}: {
  dataView: DataView | undefined;
  services: DiscoverServices;
  state: DiscoverStateContainer;
  onOpenInspector: () => void;
  hasUnsavedChanges: boolean;
  isEsqlMode: boolean;
  adHocDataViews: DataView[];
  topNavCustomization: TopNavCustomization | undefined;
  shouldShowESQLToDataViewTransitionModal: boolean;
  hasShareIntegration: boolean;
  persistedDiscoverSession: DiscoverSession | undefined;
}): AppMenuConfig => {
  const dispatch = useInternalStateDispatch();
  const currentDataView = useCurrentDataView();
  const appId = useObservable(services.application.currentAppId$);
  const currentTab = useCurrentTabSelector((tabState) => tabState);
  const { authorizedRuleTypes }: { authorizedRuleTypes: RuleTypeWithDescription[] } =
    useGetRuleTypesPermissions({
      http: services.http,
      toasts: services.notifications.toasts,
    });
  const totalHits$ = state.dataState.data$.totalHits$;
  const totalHitsState = useDataState(totalHits$);

  const getAuthorizedWriteConsumerIds = (ruleTypes: RuleTypeWithDescription[]): string[] =>
    ruleTypes
      .filter((ruleType) =>
        Object.values(ruleType.authorizedConsumers).some((consumer) => consumer.all)
      )
      .map((ruleType) => ruleType.id);

  const discoverParams: AppMenuDiscoverParams = useMemo(
    () => ({
      isEsqlMode,
      dataView,
      adHocDataViews,
      authorizedRuleTypeIds: getAuthorizedWriteConsumerIds(authorizedRuleTypes),
      actions: {
        updateAdHocDataViews: async (adHocDataViewList) => {
          await dispatch(internalStateActions.loadDataViewList());
          dispatch(internalStateActions.setAdHocDataViews(adHocDataViewList));
        },
      },
    }),
    [isEsqlMode, dataView, adHocDataViews, dispatch, authorizedRuleTypes]
  );

  const defaultMenu = topNavCustomization?.defaultMenu;

  const appMenuPrimaryAndSecondaryItems: Array<AppMenuItemPrimary | AppMenuItemSecondary> =
    useMemo(() => {
      const items: Array<AppMenuItemPrimary | AppMenuItemSecondary> = [];
      if (!defaultMenu?.inspectItem?.disabled) {
        const inspectAppMenuItem = getInspectAppMenuItem({ onOpenInspector });
        items.push(inspectAppMenuItem);
      }

      if (
        services.triggersActionsUi &&
        !defaultMenu?.alertsItem?.disabled &&
        discoverParams.authorizedRuleTypeIds.length
      ) {
        const alertsAppMenuItem = getAlertsAppMenuItem({
          discoverParams,
          services,
          stateContainer: state,
        });
        items.push(alertsAppMenuItem);
      }

      if (
        !!appId &&
        services.data.search.isBackgroundSearchEnabled &&
        services.capabilities.discover_v2.storeSearchSession
      ) {
        const backgroundSearchFlyoutMenuItem = getBackgroundSearchFlyout({
          onClick: () => {
            services.data.search.showSearchSessionsFlyout({
              appId,
              trackingProps: { openedFrom: 'background search button' },
              onBackgroundSearchOpened: services.discoverFeatureFlags.getTabsEnabled()
                ? ({ session, event }) => {
                    event?.preventDefault();
                    dispatch(
                      internalStateActions.openSearchSessionInNewTab({ searchSession: session })
                    );
                  }
                : undefined,
            });
          },
        });
        items.push(backgroundSearchFlyoutMenuItem);
      }

      if (!defaultMenu?.newItem?.disabled) {
        const defaultEsqlState: Pick<DiscoverAppState, 'query'> | undefined =
          isEsqlMode && currentDataView.type === ESQL_TYPE
            ? { query: { esql: getInitialESQLQuery(currentDataView, true) } }
            : undefined;
        const locatorParams: DiscoverAppLocatorParams = defaultEsqlState
          ? defaultEsqlState
          : currentDataView.isPersisted()
          ? { dataViewId: currentDataView.id }
          : { dataViewSpec: currentDataView.toMinimalSpec() };
        const newSearchMenuItem = getNewSearchAppMenuItem({
          newSearchUrl: services.locator.getRedirectUrl(locatorParams),
          onNewSearch: () => {
            const defaultState: DiscoverAppState = defaultEsqlState ?? {
              dataSource: currentDataView.id
                ? createDataViewDataSource({ dataViewId: currentDataView.id })
                : undefined,
            };
            services.application.navigateToApp(DISCOVER_APP_ID, { state: { defaultState } });
          },
        });
        items.push(newSearchMenuItem);
      }

      if (!defaultMenu?.openItem?.disabled) {
        const openSearchMenuItem = getOpenSearchAppMenuItem({
          onOpenSavedSearch: state.actions.onOpenSavedSearch,
        });
        items.push(openSearchMenuItem);
      }

      if (!defaultMenu?.shareItem?.disabled) {
        const shareAppMenuItem = getShareAppMenuItem({
          discoverParams,
          services,
          stateContainer: state,
          hasIntegrations: hasShareIntegration,
          hasUnsavedChanges,
          currentTab,
          persistedDiscoverSession,
          totalHitsState,
        });
        items.push(...shareAppMenuItem);
      }

      return items;
    }, [
      defaultMenu,
      services,
      discoverParams,
      appId,
      onOpenInspector,
      state,
      dispatch,
      isEsqlMode,
      currentDataView,
      currentTab,
      persistedDiscoverSession,
      hasShareIntegration,
      hasUnsavedChanges,
      totalHitsState,
    ]);

  const getAppMenuAccessor = useProfileAccessor('getAppMenu');
  const appMenuRegistry = useMemo(() => {
    const newAppMenuRegistry = new AppMenuRegistry(appMenuPrimaryAndSecondaryItems);
    const getAppMenu = getAppMenuAccessor(() => ({
      appMenuRegistry: () => newAppMenuRegistry,
    }));

    return getAppMenu(discoverParams).appMenuRegistry(newAppMenuRegistry);
  }, [getAppMenuAccessor, discoverParams, appMenuPrimaryAndSecondaryItems]);

  return useMemo((): AppMenuConfig => {
    const items: AppMenuConfig['items'] = [];
    let orderCounter = 100;

    // Map app menu registry items to AppMenuConfig items
    appMenuRegistry.getSortedItems().forEach((appMenuItem) => {
      if ('actions' in appMenuItem) {
        // Submenu item - map to item with popover items
        items.push({
          id: appMenuItem.id,
          label: appMenuItem.label,
          iconType: 'boxesHorizontal', // default icon for submenu
          testId: appMenuItem.testId,
          order: orderCounter++,
          items: appMenuItem.actions
            .filter((action) => action.type !== 'submenuHorizontalRule')
            .map((action, index) => ({
              id: action.id,
              label: 'controlProps' in action ? action.controlProps.label : '',
              order: action.order ?? index * 100,
              run:
                'controlProps' in action && action.controlProps.onClick
                  ? () =>
                      action.controlProps.onClick?.({
                        anchorElement: document.body,
                        onFinishAction: () => {},
                      })
                  : () => {},
              ...('controlProps' in action && action.controlProps.testId
                ? { testId: action.controlProps.testId }
                : {}),
              ...('controlProps' in action &&
              'iconType' in action.controlProps &&
              action.controlProps.iconType
                ? { iconType: action.controlProps.iconType }
                : {}),
            })),
        });
      } else {
        // Simple item
        const controlProps = appMenuItem.controlProps;
        items.push({
          id: appMenuItem.id,
          label: controlProps.label,
          iconType: 'iconType' in controlProps ? controlProps.iconType : 'empty',
          testId: controlProps.testId,
          order: orderCounter++,
          run: controlProps.onClick
            ? () =>
                controlProps.onClick?.({
                  anchorElement: document.body,
                  onFinishAction: () => {},
                })
            : () => {},
          ...(controlProps.href ? { href: controlProps.href } : {}),
          ...(controlProps.tooltip ? { tooltipContent: controlProps.tooltip } : {}),
          ...(controlProps.disableButton !== undefined
            ? { disableButton: controlProps.disableButton }
            : {}),
          ...(controlProps.isLoading !== undefined ? { isLoading: controlProps.isLoading } : {}),
        });
      }
    });

    if (services.uiSettings.get(ENABLE_ESQL)) {
      /**
       * Switches from ES|QL to classic mode and vice versa
       */
      items.unshift({
        id: 'esql',
        label: isEsqlMode
          ? i18n.translate('discover.localMenu.switchToClassicTitle', {
              defaultMessage: 'Switch to classic',
            })
          : i18n.translate('discover.localMenu.tryESQLTitle', {
              defaultMessage: 'Try ES|QL',
            }),
        iconType: 'editorCodeBlock',
        // fill: false,
        // color: 'text',
        tooltipContent: isEsqlMode
          ? i18n.translate('discover.localMenu.switchToClassicTooltipLabel', {
              defaultMessage: 'Switch to KQL or Lucene syntax.',
            })
          : i18n.translate('discover.localMenu.esqlTooltipLabel', {
              defaultMessage: `ES|QL is Elastic's powerful new piped query language.`,
            }),
        run: () => {
          if (dataView) {
            if (isEsqlMode) {
              services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:back_to_classic_clicked`);
              /**
               * Display the transition modal if:
               * - the user has not dismissed the modal
               * - the user has opened and applied changes to the saved search
               */
              if (
                shouldShowESQLToDataViewTransitionModal &&
                !services.storage.get(ESQL_TRANSITION_MODAL_KEY)
              ) {
                dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(true));
              } else {
                state.actions.transitionFromESQLToDataView(dataView.id ?? '');
              }
            } else {
              state.actions.transitionFromDataViewToESQL(dataView);
              services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:try_btn_clicked`);
            }
          }
        },
        testId: isEsqlMode ? 'switch-to-dataviews' : 'select-text-based-language-btn',
        order: 0,
      });
    }

    if (services.capabilities.discover_v2.save && !defaultMenu?.saveItem?.disabled) {
      items.push({
        id: 'save',
        label: i18n.translate('discover.localMenu.saveTitle', {
          defaultMessage: 'Save',
        }),
        // description: i18n.translate('discover.localMenu.saveSearchDescription', {
        //   defaultMessage: 'Save session',
        // }),
        testId: 'discoverSaveButton',
        iconType: 'save',
        run: () => {
          onSaveDiscoverSession({
            services,
            state,
          });
        },
        order: 1000,
      });
    }

    return { items };
  }, [
    appMenuRegistry,
    services,
    defaultMenu?.saveItem?.disabled,
    isEsqlMode,
    dataView,
    shouldShowESQLToDataViewTransitionModal,
    dispatch,
    state,
  ]);
};
