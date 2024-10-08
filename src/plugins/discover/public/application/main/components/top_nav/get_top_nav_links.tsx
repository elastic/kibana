/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import {
  AppMenuAction,
  AppMenuActionId,
  AppMenuActionType,
  AppMenuItem,
} from '@kbn/discover-utils';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import { DiscoverServices } from '../../../../build_services';
import { onSaveSearch } from './on_save_search';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import { openAlertsPopover } from './open_alerts_popover';
import type { TopNavCustomization } from '../../../../customizations';
import { runAppMenuAction, runAppMenuPopoverAction } from './run_app_menu_action';
import { runShareAction } from './run_share_action';
import { OpenSearchPanel } from './open_search_panel';

/**
 * Helper function to build the top nav links
 */
export const getTopNavLinks = ({
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
  const alerts = {
    id: 'alerts',
    label: i18n.translate('discover.localMenu.localMenu.alertsTitle', {
      defaultMessage: 'Alerts',
    }),
    description: i18n.translate('discover.localMenu.alertsDescription', {
      defaultMessage: 'Alerts',
    }),
    run: async (anchorElement: HTMLElement) => {
      openAlertsPopover({
        anchorElement,
        services,
        stateContainer: state,
        adHocDataViews,
        isEsqlMode,
      });
    },
    testId: 'discoverAlertsButton',
  };

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

  const stateParams = { services, stateContainer: state, adHocDataViews, isEsqlMode };
  const newSearchItem: AppMenuAction = {
    id: AppMenuActionId.new,
    type: AppMenuActionType.secondary, // TODO: convert to primary
    controlProps: {
      label: i18n.translate('discover.localMenu.localMenu.newSearchTitle', {
        defaultMessage: 'New',
      }),
      description: i18n.translate('discover.localMenu.newSearchDescription', {
        defaultMessage: 'New Search',
      }),
      testId: 'discoverNewButton',
      onClick: () => {
        services.locator.navigate({});
      },
    },
  };
  const newSearch = convertMenuItem({ appMenuItem: newSearchItem, stateParams });

  const saveSearch = {
    id: 'save',
    label: i18n.translate('discover.localMenu.saveTitle', {
      defaultMessage: 'Save',
    }),
    description: i18n.translate('discover.localMenu.saveSearchDescription', {
      defaultMessage: 'Save Search',
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

  const openSearchItem: AppMenuAction = {
    id: AppMenuActionId.open,
    type: AppMenuActionType.secondary, // TODO: convert to primary
    controlProps: {
      label: i18n.translate('discover.localMenu.openTitle', {
        defaultMessage: 'Open',
      }),
      description: i18n.translate('discover.localMenu.openSavedSearchDescription', {
        defaultMessage: 'Open Saved Search',
      }),
      testId: 'discoverOpenButton',
      onClick: ({ onFinishAction }) => {
        return (
          <OpenSearchPanel
            onClose={onFinishAction}
            onOpenSavedSearch={state.actions.onOpenSavedSearch}
          />
        );
      },
    },
  };
  const openSearch = convertMenuItem({ appMenuItem: openSearchItem, stateParams });

  const shareSearch = {
    id: 'share',
    label: i18n.translate('discover.localMenu.shareTitle', {
      defaultMessage: 'Share',
    }),
    description: i18n.translate('discover.localMenu.shareSearchDescription', {
      defaultMessage: 'Share Search',
    }),
    testId: 'shareTopNavButton',
    run: async (anchorElement: HTMLElement) => {
      await runShareAction({
        anchorElement,
        dataView,
        stateContainer: state,
        services,
        isEsqlMode,
      });
    },
  };

  const inspectSearchItem: AppMenuAction = {
    id: AppMenuActionId.inspect,
    type: AppMenuActionType.secondary,
    controlProps: {
      label: i18n.translate('discover.localMenu.inspectTitle', {
        defaultMessage: 'Inspect',
      }),
      description: i18n.translate('discover.localMenu.openInspectorForSearchDescription', {
        defaultMessage: 'Open Inspector for search',
      }),
      testId: 'openInspectorButton',
      onClick: () => {
        onOpenInspector();
      },
    },
  };
  const inspectSearch = convertMenuItem({ appMenuItem: inspectSearchItem, stateParams });

  const defaultMenu = topNavCustomization?.defaultMenu;
  const entries = [...(topNavCustomization?.getMenuItems?.() ?? [])];

  if (services.uiSettings.get(ENABLE_ESQL)) {
    entries.push({ data: esqLDataViewTransitionToggle, order: 0 });
  }

  if (!defaultMenu?.newItem?.disabled) {
    entries.push({ data: newSearch, order: defaultMenu?.newItem?.order ?? 100 });
  }

  if (!defaultMenu?.openItem?.disabled) {
    entries.push({ data: openSearch, order: defaultMenu?.openItem?.order ?? 200 });
  }

  if (!defaultMenu?.shareItem?.disabled) {
    entries.push({ data: shareSearch, order: defaultMenu?.shareItem?.order ?? 300 });
  }

  if (
    services.triggersActionsUi &&
    services.capabilities.management?.insightsAndAlerting?.triggersActions &&
    !defaultMenu?.alertsItem?.disabled
  ) {
    entries.push({ data: alerts, order: defaultMenu?.alertsItem?.order ?? 400 });
  }

  if (!defaultMenu?.inspectItem?.disabled) {
    entries.push({ data: inspectSearch, order: defaultMenu?.inspectItem?.order ?? 500 });
  }

  if (services.capabilities.discover.save && !defaultMenu?.saveItem?.disabled) {
    entries.push({ data: saveSearch, order: defaultMenu?.saveItem?.order ?? 600 });
  }

  return entries.sort((a, b) => a.order - b.order).map((entry) => entry.data);
};

function convertMenuItem({
  appMenuItem,
  stateParams: { services, stateContainer, adHocDataViews, isEsqlMode },
}: {
  appMenuItem: AppMenuItem;
  stateParams: {
    stateContainer: DiscoverStateContainer;
    services: DiscoverServices;
    adHocDataViews: DataView[];
    isEsqlMode?: boolean;
  };
}): TopNavMenuData {
  if ('actions' in appMenuItem) {
    return {
      id: appMenuItem.id,
      label: appMenuItem.label,
      description: appMenuItem.label,
      run: (anchorElement: HTMLElement) => {
        runAppMenuPopoverAction({
          appMenuItem,
          anchorElement,
          stateContainer,
          adHocDataViews,
          services,
          isEsqlMode,
        });
      },
      testId: appMenuItem.id,
    };
  }

  return {
    id: appMenuItem.id,
    label: appMenuItem.controlProps.label,
    description: appMenuItem.controlProps.label,
    run: async (anchorElement: HTMLElement) => {
      await runAppMenuAction({
        appMenuItem,
        anchorElement,
        services,
      });
    },
    testId: appMenuItem.id,
  };
}
