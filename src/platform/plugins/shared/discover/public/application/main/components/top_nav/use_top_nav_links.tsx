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
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { AppMenuItemPrimary, AppMenuItemSecondary, AppMenuRegistry } from '@kbn/discover-utils';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import { DiscoverServices } from '../../../../build_services';
import { onSaveSearch } from './on_save_search';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import {
  getAlertsAppMenuItem,
  getNewSearchAppMenuItem,
  getOpenSearchAppMenuItem,
  getShareAppMenuItem,
  getInspectAppMenuItem,
  convertAppMenuItemToTopNavItem,
  AppMenuDiscoverParams,
} from './app_menu_actions';
import type { TopNavCustomization } from '../../../../customizations';
import { useProfileAccessor } from '../../../../context_awareness';

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
}: {
  dataView: DataView | undefined;
  services: DiscoverServices;
  state: DiscoverStateContainer;
  onOpenInspector: () => void;
  isEsqlMode: boolean;
  adHocDataViews: DataView[];
  topNavCustomization: TopNavCustomization | undefined;
  shouldShowESQLToDataViewTransitionModal: boolean;
}): TopNavMenuData[] => {
  const discoverParams: AppMenuDiscoverParams = useMemo(
    () => ({
      isEsqlMode,
      dataView,
      adHocDataViews,
      onUpdateAdHocDataViews: async (adHocDataViewList) => {
        await state.actions.loadDataViewList();
        state.internalState.transitions.setAdHocDataViews(adHocDataViewList);
      },
    }),
    [isEsqlMode, dataView, adHocDataViews, state]
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
        services.capabilities.management?.insightsAndAlerting?.triggersActions &&
        !defaultMenu?.alertsItem?.disabled
      ) {
        const alertsAppMenuItem = getAlertsAppMenuItem({
          discoverParams,
          services,
          stateContainer: state,
        });
        items.push(alertsAppMenuItem);
      }

      if (!defaultMenu?.newItem?.disabled) {
        const newSearchMenuItem = getNewSearchAppMenuItem({
          onNewSearch: () => {
            services.locator.navigate({});
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
        });
        items.push(shareAppMenuItem);
      }

      return items;
    }, [discoverParams, state, services, defaultMenu, onOpenInspector]);

  const getAppMenuAccessor = useProfileAccessor('getAppMenu');
  const appMenuRegistry = useMemo(() => {
    const newAppMenuRegistry = new AppMenuRegistry(appMenuPrimaryAndSecondaryItems);
    const getAppMenu = getAppMenuAccessor(() => ({
      appMenuRegistry: () => newAppMenuRegistry,
    }));

    return getAppMenu(discoverParams).appMenuRegistry(newAppMenuRegistry);
  }, [getAppMenuAccessor, discoverParams, appMenuPrimaryAndSecondaryItems]);

  return useMemo(() => {
    const entries = appMenuRegistry.getSortedItems().map((appMenuItem) =>
      convertAppMenuItemToTopNavItem({
        appMenuItem,
        services,
      })
    );

    if (services.uiSettings.get(ENABLE_ESQL)) {
      /**
       * Switches from ES|QL to classic mode and vice versa
       */
      const esqLDataViewTransitionToggle = {
        id: 'esql',
        label: isEsqlMode
          ? i18n.translate('discover.localMenu.switchToClassicTitle', {
              defaultMessage: 'Switch to classic',
            })
          : i18n.translate('discover.localMenu.tryESQLTitle', {
              defaultMessage: 'Try ES|QL',
            }),
        emphasize: true,
        fill: false,
        color: 'text',
        tooltip: isEsqlMode
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
                state.internalState.transitions.setIsESQLToDataViewTransitionModalVisible(true);
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
      };
      entries.unshift(esqLDataViewTransitionToggle);
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
        testId: 'discoverSaveButton',
        iconType: 'save',
        emphasize: true,
        run: (anchorElement: HTMLElement) => {
          onSaveSearch({
            savedSearch: state.savedSearchState.getState(),
            services,
            state,
            onClose: () => {
              anchorElement?.focus();
            },
          });
        },
      };
      entries.push(saveSearch);
    }

    return entries;
  }, [
    services,
    appMenuRegistry,
    state,
    dataView,
    isEsqlMode,
    shouldShowESQLToDataViewTransitionModal,
    defaultMenu,
  ]);
};
