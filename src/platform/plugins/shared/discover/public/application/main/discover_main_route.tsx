/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useHistory } from 'react-router-dom';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useState } from 'react';
import React from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import type { AppMountParameters } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  type DiscoverInternalState,
  InternalStateProvider,
  internalStateActions,
} from './state_management/redux';
import type { RootProfileState } from '../../context_awareness';
import { useRootProfile, useDefaultAdHocDataViews } from '../../context_awareness';
import { DiscoverError } from '../../components/common/error_alert';
import type { DiscoverSessionViewProps } from './components/session_view';
import {
  BrandedLoadingIndicator,
  DiscoverSessionView,
  NoDataPage,
} from './components/session_view';
import { useAsyncFunction } from './hooks/use_async_function';
import { TabsView } from './components/tabs_view';
import { TABS_ENABLED_FEATURE_FLAG_KEY } from '../../constants';
import { ChartPortalsRenderer } from './components/chart';
import { useStateManagers } from './state_management/hooks/use_state_managers';
import { getUserAndSpaceIds } from './utils/get_user_and_space_ids';
import { DeveloperToolbarAction, DeveloperToolbarProvider } from '@kbn/developer-toolbar';
import { EuiBadge, EuiSwitch } from '@elastic/eui';

export interface MainRouteProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
  onAppLeave?: AppMountParameters['onAppLeave'];
}

type InitializeMainRoute = (
  rootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>
) => Promise<DiscoverInternalState['initializationState']>;

const defaultCustomizationCallbacks: CustomizationCallback[] = [];

export const DiscoverMainRoute = ({
  customizationContext,
  customizationCallbacks = defaultCustomizationCallbacks,
  stateStorageContainer,
  onAppLeave,
}: MainRouteProps) => {
  const services = useDiscoverServices();
  const _tabsEnabled = services.core.featureFlags.getBooleanValue(
    TABS_ENABLED_FEATURE_FLAG_KEY,
    false
  );
  const [tabsOverride, setTabsOverride] = useState<boolean | undefined>(undefined);
  const tabsEnabled = tabsOverride ?? _tabsEnabled;

  const rootProfileState = useRootProfile();
  const history = useHistory();
  const [urlStateStorage] = useState(
    () =>
      stateStorageContainer ??
      createKbnUrlStateStorage({
        useHash: services.uiSettings.get('state:storeInSessionStorage'),
        history,
        useHashQuery: customizationContext.displayMode !== 'embedded',
        ...withNotifyOnErrors(services.core.notifications.toasts),
      })
  );

  const { internalState, runtimeStateManager } = useStateManagers({
    services,
    urlStateStorage,
    customizationContext,
  });
  const { initializeProfileDataViews } = useDefaultAdHocDataViews({ internalState });
  const [mainRouteInitializationState, initializeMainRoute] = useAsyncFunction<InitializeMainRoute>(
    async (loadedRootProfileState) => {
      const { dataViews } = services;
      const [hasESData, hasUserDataView, defaultDataViewExists, userAndSpaceIds] =
        await Promise.all([
          dataViews.hasData.hasESData().catch(() => false),
          dataViews.hasData.hasUserDataView().catch(() => false),
          dataViews.defaultDataViewExists().catch(() => false),
          getUserAndSpaceIds(services),
          internalState.dispatch(internalStateActions.loadDataViewList()).catch(() => {}),
          initializeProfileDataViews(loadedRootProfileState).catch(() => {}),
        ]);

      internalState.dispatch(internalStateActions.initializeTabs(userAndSpaceIds));

      const initializationState: DiscoverInternalState['initializationState'] = {
        hasESData,
        hasUserDataView: hasUserDataView && defaultDataViewExists,
      };

      internalState.dispatch(internalStateActions.setInitializationState(initializationState));

      return initializationState;
    }
  );

  useEffect(() => {
    if (!rootProfileState.rootProfileLoading) {
      initializeMainRoute(rootProfileState);
    }
  }, [initializeMainRoute, rootProfileState]);

  useEffect(() => {
    onAppLeave?.((actions) => {
      const tabs = runtimeStateManager.tabs.byId;
      const hasAnyUnsavedTab = Object.values(tabs).some((tab) => {
        const stateContainer = tab.stateContainer$.getValue();
        if (!stateContainer) {
          return false;
        }

        const isSaved = !!stateContainer.savedSearchState.getId();
        const hasChanged = stateContainer.savedSearchState.getHasChanged$().getValue();

        return isSaved && hasChanged;
      });

      if (!hasAnyUnsavedTab) return actions.default();

      return actions.confirm(
        i18n.translate('discover.confirmModal.confirmTextDescription', {
          defaultMessage:
            "You'll lose unsaved changes if you open another Discover session before returning to this one.",
        }),
        i18n.translate('discover.confirmModal.title', {
          defaultMessage: 'Unsaved changes',
        }),
        () => {},
        i18n.translate('discover.confirmModal.confirmText', {
          defaultMessage: 'Leave without saving',
        }),
        'danger'
      );
    });
  }, [onAppLeave, runtimeStateManager]);

  useUnmount(() => {
    for (const tabId of Object.keys(runtimeStateManager.tabs.byId)) {
      internalState.dispatch(internalStateActions.disconnectTab({ tabId }));
    }
  });

  if (rootProfileState.rootProfileLoading || mainRouteInitializationState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (mainRouteInitializationState.error) {
    return <DiscoverError error={mainRouteInitializationState.error} />;
  }

  if (
    !mainRouteInitializationState.value.hasESData &&
    !mainRouteInitializationState.value.hasUserDataView
  ) {
    return (
      <NoDataPage
        {...mainRouteInitializationState.value}
        onDataViewCreated={() => {
          // This is unused if there is no ES data
        }}
      />
    );
  }

  const sessionViewProps: DiscoverSessionViewProps = {
    customizationContext,
    customizationCallbacks,
    urlStateStorage,
    internalState,
    runtimeStateManager,
  };

  return (
    <DeveloperToolbarProvider>
      <InternalStateProvider store={internalState}>
        <rootProfileState.AppWrapper>
          <ChartPortalsRenderer runtimeStateManager={sessionViewProps.runtimeStateManager}>
            {tabsEnabled ? (
              <TabsView {...sessionViewProps} />
            ) : (
              <DiscoverSessionView {...sessionViewProps} />
            )}
          </ChartPortalsRenderer>
        </rootProfileState.AppWrapper>

        <DeveloperToolbarAction id={'discoverTabs'} priority={100} tooltip={'Discover Tabs'}>
          <EuiSwitch
            showLabel={true}
            label={'Tabs'}
            checked={tabsEnabled}
            onChange={async () => {
              setTabsOverride(!tabsEnabled);
            }}
            compressed
          />
        </DeveloperToolbarAction>
      </InternalStateProvider>
    </DeveloperToolbarProvider>
  );
};
