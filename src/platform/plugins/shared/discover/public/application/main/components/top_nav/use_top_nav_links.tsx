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
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { AppMenuRegistry, dismissFlyouts, DiscoverFlyouts } from '@kbn/discover-utils';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import type { RuleTypeWithDescription } from '@kbn/alerts-ui-shared';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import useObservable from 'react-use/lib/useObservable';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { useI18n } from '@kbn/i18n-react';
import type { DiscoverAppLocatorParams } from '../../../../../common';
import { createDataViewDataSource } from '../../../../../common/data_sources';
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
  enhanceAppMenuItemWithRunAction,
} from './app_menu_actions';
import { useProfileAccessor } from '../../../../context_awareness';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
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
  hasShareIntegration: boolean;
  persistedDiscoverSession: DiscoverSession | undefined;
}): AppMenuConfig => {
  const intl = useI18n();
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

  const appMenuItems: DiscoverAppMenuItemType[] = useMemo(() => {
    const items: DiscoverAppMenuItemType[] = [];

    const inspectAppMenuItem = getInspectAppMenuItem({ onOpenInspector });
    items.push(inspectAppMenuItem);

    if (services.triggersActionsUi && discoverParams.authorizedRuleTypeIds.length) {
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
        onClick: ({ context: { onFinishAction } }) => {
          services.data.search.showSearchSessionsFlyout({
            appId,
            trackingProps: { openedFrom: 'background search button' },
            onBackgroundSearchOpened: ({ session, event }) => {
              event?.preventDefault();
              dispatch(internalStateActions.openSearchSessionInNewTab({ searchSession: session }));
            },
            onClose: onFinishAction,
          });
        },
      });
      items.push(backgroundSearchFlyoutMenuItem);
    }

    if (!services.embeddableEditor.isEmbeddedEditor()) {
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

    if (!services.embeddableEditor.isEmbeddedEditor()) {
      const openSearchMenuItem = getOpenSearchAppMenuItem({
        onOpenSavedSearch: (discoverSessionId) =>
          dispatch(internalStateActions.openDiscoverSession({ discoverSessionId })),
      });
      items.push(openSearchMenuItem);
    }

    const shareAppMenuItem = getShareAppMenuItem({
      discoverParams,
      services,
      stateContainer: state,
      hasIntegrations: hasShareIntegration,
      hasUnsavedChanges,
      currentTab,
      persistedDiscoverSession,
      totalHitsState,
      intl,
    });
    items.push(...shareAppMenuItem);

    return items;
  }, [
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
    intl,
  ]);

  const transitionFromDataViewToESQL = useCurrentTabAction(
    internalStateActions.transitionFromDataViewToESQL
  );

  const getAppMenuAccessor = useProfileAccessor('getAppMenu');
  const appMenuRegistry = useMemo(() => {
    const newAppMenuRegistry = new AppMenuRegistry();

    newAppMenuRegistry.registerItems(appMenuItems);

    // Only show the ES|QL button in classic mode (not in ES|QL mode)
    // The "Switch to Classic" option is now in the tab menu when in ES|QL mode
    if (services.uiSettings.get(ENABLE_ESQL) && !isEsqlMode) {
      newAppMenuRegistry.setSecondaryActionItem({
        id: 'esql',
        label: i18n.translate('discover.localMenu.tryESQLTitle', {
          defaultMessage: 'ES|QL',
        }),
        iconType: 'editorCodeBlock',
        color: 'success',
        tooltipContent: i18n.translate('discover.localMenu.esqlTooltipLabel', {
          defaultMessage: `ES|QL is Elastic's powerful new piped query language.`,
        }),
        run: () => {
          if (dataView) {
            dispatch(transitionFromDataViewToESQL({ dataView }));
            services.trackUiMetric?.(METRIC_TYPE.CLICK, `esql:try_btn_clicked`);
          }
        },
        testId: 'select-text-based-language-btn',
      });
    }

    if (services.capabilities.discover_v2.save) {
      const isEmbeddedEditor = services.embeddableEditor.isEmbeddedEditor();

      newAppMenuRegistry.setPrimaryActionItem({
        id: 'save',
        label: isEmbeddedEditor
          ? i18n.translate('discover.localMenu.saveAndReturnTitle', {
              defaultMessage: 'Save and return',
            })
          : i18n.translate('discover.localMenu.saveTitle', {
              defaultMessage: 'Save',
            }),
        testId: 'discoverSaveButton',
        iconType: isEmbeddedEditor ? 'checkInCircleFilled' : 'save',
        run: async () => {
          await onSaveDiscoverSession({
            services,
            state,
            onSaveCb: isEmbeddedEditor ? services.embeddableEditor.transferBackToEditor : undefined,
          });
        },
        popoverWidth: 150,
        popoverTestId: 'discoverSaveButtonPopover',
        splitButtonProps: {
          secondaryButtonIcon: 'arrowDown',
          secondaryButtonAriaLabel: i18n.translate('discover.localMenu.saveOptionsAriaLabel', {
            defaultMessage: 'Save options',
          }),
          // Show different split button options when in embedded editor mode
          ...(isEmbeddedEditor
            ? {
                items: [
                  {
                    run: () => services.embeddableEditor.transferBackToEditor(),
                    id: 'cancel',
                    order: 100,
                    label: i18n.translate('discover.localMenu.cancelTitle', {
                      defaultMessage: 'Cancel',
                    }),
                    iconType: 'editorUndo',
                    testId: 'discoverCancelButton',
                  },
                ],
              }
            : {
                showNotificationIndicator: hasUnsavedChanges,
                notifcationIndicatorTooltipContent: hasUnsavedChanges
                  ? i18n.translate('discover.localMenu.unsavedChangesTooltip', {
                      defaultMessage: 'You have unsaved changes',
                    })
                  : undefined,
                items: [
                  {
                    run: async () => {
                      await onSaveDiscoverSession({
                        initialCopyOnSave: true,
                        services,
                        state,
                      });
                    },
                    id: 'saveAs',
                    order: 1,
                    label: i18n.translate('discover.localMenu.saveAsTitle', {
                      defaultMessage: 'Save as',
                    }),
                    iconType: 'save',
                    testId: 'interactiveSaveMenuItem',
                  },
                  {
                    run: async () => {
                      dismissFlyouts([DiscoverFlyouts.lensEdit]);

                      const internalState = state.internalState.getState();

                      if (internalState.persistedDiscoverSession) {
                        await state.internalState
                          .dispatch(internalStateActions.resetDiscoverSession())
                          .unwrap();
                      }
                    },
                    id: 'resetChanges',
                    order: 2,
                    label: i18n.translate('discover.localMenu.resetChangesTitle', {
                      defaultMessage: 'Reset changes',
                    }),
                    iconType: 'editorUndo',
                    testId: 'revertUnsavedChangesButton',
                    disableButton: !hasUnsavedChanges,
                  },
                ],
              }),
        },
      });
    }

    // Allow profile accessors to add additional items/popover items
    const getAppMenu = getAppMenuAccessor(() => ({
      appMenuRegistry: () => newAppMenuRegistry,
    }));

    return getAppMenu(discoverParams).appMenuRegistry(newAppMenuRegistry);
  }, [
    getAppMenuAccessor,
    discoverParams,
    appMenuItems,
    services,
    isEsqlMode,
    dataView,
    dispatch,
    state,
    hasUnsavedChanges,
    transitionFromDataViewToESQL,
  ]);

  return useMemo((): AppMenuConfig => {
    const config = appMenuRegistry.getAppMenuConfig();

    return {
      items: config.items?.map((item) =>
        enhanceAppMenuItemWithRunAction({
          appMenuItem: item,
          services,
        })
      ),
      primaryActionItem: config.primaryActionItem
        ? enhanceAppMenuItemWithRunAction({
            appMenuItem: config.primaryActionItem,
            services,
          })
        : undefined,
      secondaryActionItem: config.secondaryActionItem
        ? enhanceAppMenuItemWithRunAction({
            appMenuItem: config.secondaryActionItem,
            services,
          })
        : undefined,
    };
  }, [appMenuRegistry, services]);
};
