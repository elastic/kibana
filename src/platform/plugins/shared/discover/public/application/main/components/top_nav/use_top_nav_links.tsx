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
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL, getInitialESQLQuery } from '@kbn/esql-utils';
import { AppMenuActionType } from '@kbn/discover-utils';
import {
  AppMenuRegistry,
  type AppMenuItemPrimary,
  type AppMenuItemSecondary,
} from '@kbn/discover-utils';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import type { RuleTypeWithDescription } from '@kbn/alerts-ui-shared';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import type { DiscoverServices } from '../../../../build_services';
import { onSaveDiscoverSession } from './save_discover_session';
import { runAppMenuPopoverAction } from './app_menu_actions/run_app_menu_action';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import type { AppMenuDiscoverParams } from './app_menu_actions';
import {
  getAlertsAppMenuItem,
  getNewSearchAppMenuItem,
  getOpenSearchAppMenuItem,
  getShareAppMenuItem,
  getInspectAppMenuItem,
  convertAppMenuItemToTopNavItem,
} from './app_menu_actions';
import type { TopNavCustomization } from '../../../../customizations';
import { useProfileAccessor } from '../../../../context_awareness';
import {
  internalStateActions,
  useCurrentDataView,
  useInternalStateDispatch,
} from '../../state_management/redux';
import type { DiscoverAppLocatorParams } from '../../../../../common';
import type { DiscoverAppState } from '../../state_management/discover_app_state_container';

/**
 * Helper function to build the top nav links
 */
export const useTopNavLinks = ({
  dataView,
  services,
  state,
  onOpenInspector,
  isEsqlMode,
  adHocDataViews,
  topNavCustomization,
  shouldShowESQLToDataViewTransitionModal,
  hasShareIntegration,
  hasUnsavedChanges,
}: {
  dataView: DataView | undefined;
  services: DiscoverServices;
  state: DiscoverStateContainer;
  onOpenInspector: () => void;
  isEsqlMode: boolean;
  adHocDataViews: DataView[];
  topNavCustomization: TopNavCustomization | undefined;
  shouldShowESQLToDataViewTransitionModal: boolean;
  hasShareIntegration: boolean;
  hasUnsavedChanges: boolean;
}): TopNavMenuData[] => {
  const dispatch = useInternalStateDispatch();
  const currentDataView = useCurrentDataView();
  const { authorizedRuleTypes }: { authorizedRuleTypes: RuleTypeWithDescription[] } =
    useGetRuleTypesPermissions({
      http: services.http,
      toasts: services.notifications.toasts,
    });

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
      // if (!defaultMenu?.inspectItem?.disabled) {
      //   const inspectAppMenuItem = getInspectAppMenuItem({ onOpenInspector });
      //   items.push(inspectAppMenuItem);
      // }

      // if (
      //   services.triggersActionsUi &&
      //   !defaultMenu?.alertsItem?.disabled &&
      //   discoverParams.authorizedRuleTypeIds.length
      // ) {
      //   const alertsAppMenuItem = getAlertsAppMenuItem({
      //     discoverParams,
      //     services,
      //     stateContainer: state,
      //   });
      //   items.push(alertsAppMenuItem);
      // }

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
        });
        items.push(...shareAppMenuItem);
      }

      return items;
    }, [
      defaultMenu,
      services,
      onOpenInspector,
      discoverParams,
      state,
      isEsqlMode,
      currentDataView,
      hasShareIntegration,
    ]);

  const getAppMenuAccessor = useProfileAccessor('getAppMenu');
  const appMenuRegistry = useMemo(() => {
    const newAppMenuRegistry = new AppMenuRegistry(appMenuPrimaryAndSecondaryItems);
    const getAppMenu = getAppMenuAccessor(() => ({
      appMenuRegistry: () => newAppMenuRegistry,
    }));

    return getAppMenu(discoverParams).appMenuRegistry(newAppMenuRegistry);
  }, [getAppMenuAccessor, discoverParams, appMenuPrimaryAndSecondaryItems]);

  return useMemo(() => {
    const allEntries = appMenuRegistry.getSortedItems().map((appMenuItem) =>
      convertAppMenuItemToTopNavItem({
        appMenuItem,
        services,
      })
    );

    // Separate built-in Discover items from custom/outside app items
    const builtInItems = allEntries.filter(
      (item) => !['dataset-quality-link'].includes(item.id || '')
    );
    const customItems = allEntries.filter((item) =>
      ['dataset-quality-link'].includes(item.id || '')
    );

    // Build entries: built-in items first, then custom items
    const entries = [...builtInItems, ...customItems];

    if (services.uiSettings.get(ENABLE_ESQL)) {
      // Primary button: show "Try ES|QL" only when NOT already in ES|QL mode
      if (!isEsqlMode) {
        const tryEsqlButton = {
          id: 'esql',
          label: i18n.translate('discover.localMenu.tryESQLTitle', {
            defaultMessage: 'Try ES|QL',
          }),
          emphasize: true,
          fill: false,
          color: 'success',
          tooltip: i18n.translate('discover.localMenu.esqlTooltipLabel', {
            defaultMessage: `ES|QL is Elastic's powerful new piped query language.`,
          }),
          run: () => {
            if (dataView) {
              state.actions.transitionFromDataViewToESQL(dataView);
              services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:try_btn_clicked`);
            }
          },
          testId: 'select-text-based-language-btn',
        } as TopNavMenuData;
        entries.unshift(tryEsqlButton);
      }

      // Secondary button: show "Switch to classic" only when in ES|QL mode
      if (isEsqlMode) {
        const switchToClassicButton = {
          id: 'switch-to-classic',
          label: i18n.translate('discover.localMenu.switchToClassicTitle', {
            defaultMessage: 'Switch to classic',
          }),
          emphasize: false,
          fill: false,
          color: 'text',
          tooltip: i18n.translate('discover.localMenu.switchToClassicTooltipLabel', {
            defaultMessage: 'Switch to KQL or Lucene syntax.',
          }),
          run: () => {
            if (!dataView) return;
            services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:back_to_classic_clicked`);
            if (
              shouldShowESQLToDataViewTransitionModal &&
              !services.storage.get(ESQL_TRANSITION_MODAL_KEY)
            ) {
              dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(true));
            } else {
              state.actions.transitionFromESQLToDataView(dataView.id ?? '');
            }
          },
          testId: 'switch-to-dataviews',
        } as TopNavMenuData;
        // Place with other secondary items so it can overflow into "More"
        entries.push(switchToClassicButton);
      }
    }

    if (services.capabilities.discover_v2.save && !defaultMenu?.saveItem?.disabled) {
      const saveSearch = {
        id: 'save',
        label: i18n.translate('discover.localMenu.saveTitle', {
          defaultMessage: 'Save',
        }),
        description: i18n.translate('discover.localMenu.saveSearchDescription', {
          defaultMessage: 'Save session',
        }),
        className: `dscSplitSaveLeft${hasUnsavedChanges ? ' dscSplitSaveLeft--hasChanges' : ''}`,
        testId: 'discoverSaveButton',
        fill: false,
        color: 'text',
        iconType: hasUnsavedChanges ? 'dot' : undefined,
        iconSide: hasUnsavedChanges ? 'left' : undefined,
        emphasize: true,
        run: (anchorElement: HTMLElement) => {
          onSaveDiscoverSession({
            services,
            state,
            onClose: () => {
              anchorElement?.focus();
            },
          });
        },
      };
      entries.push(saveSearch);

      // Always add an adjacent icon-only primary button that opens a small popover
      // with "Save as" and "Revert changes". When there are no unsaved changes,
      // the submenu items are disabled.
      const saveMoreMenu: TopNavMenuData = {
        id: 'save-more',
        label: i18n.translate('discover.localMenu.saveMoreLabel', {
          defaultMessage: 'More save actions',
        }),
        testId: 'discoverSaveMoreButton',
        className: `dscSplitSaveRight${hasUnsavedChanges ? ' dscSplitSaveRight--hasChanges' : ''}`,
        emphasize: true,
        fill: false,
        color: 'text',
        iconOnly: true,
        iconType: 'arrowDown',
        iconDisplay: 'base',
        run: (anchorElement: HTMLElement) => {
          runAppMenuPopoverAction({
            appMenuItem: {
              id: 'save-more-submenu',
              type: AppMenuActionType.secondary,
              label: i18n.translate('discover.localMenu.saveMoreSubmenuLabel', {
                defaultMessage: 'Save options',
              }),
              actions: [
                {
                  id: 'save-as',
                  type: AppMenuActionType.secondary,
                  controlProps: {
                    label: i18n.translate('discover.localMenu.saveAsTitle', {
                      defaultMessage: 'Save as',
                    }),
                    testId: 'discoverSaveAsFromMore',
                    disableButton: !hasUnsavedChanges,
                    onClick: async ({ onFinishAction }) => {
                      await onSaveDiscoverSession({
                        initialCopyOnSave: true,
                        savedSearch: state.savedSearchState.getState(),
                        services,
                        state,
                        onClose: onFinishAction,
                      });
                    },
                  },
                },
                {
                  id: 'revert-changes',
                  type: AppMenuActionType.secondary,
                  controlProps: {
                    label: i18n.translate('discover.localMenu.revertChangesTitle', {
                      defaultMessage: 'Revert changes',
                    }),
                    testId: 'discoverRevertChangesFromMore',
                    disableButton: !hasUnsavedChanges,
                    onClick: async ({ onFinishAction }) => {
                      await state.actions.undoSavedSearchChanges();
                      onFinishAction();
                    },
                  },
                },
              ],
            },
            anchorElement,
            services,
            anchorPosition: 'downRight',
            hasArrow: false,
            offset: 4,
            buffer: 0,
          });
        },
      };
      entries.push(saveMoreMenu);
    }

    return entries;
  }, [
    appMenuRegistry,
    services,
    defaultMenu?.saveItem?.disabled,
    isEsqlMode,
    dataView,
    state,
    shouldShowESQLToDataViewTransitionModal,
    dispatch,
    hasUnsavedChanges,
  ]);
};
