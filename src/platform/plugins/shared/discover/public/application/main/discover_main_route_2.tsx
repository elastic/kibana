/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useHistory, useParams } from 'react-router-dom';
import {
  IKbnUrlStateStorage,
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import { lazy, useMemo, useState } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  AnalyticsNoDataPageKibanaDependencies,
  AnalyticsNoDataPageProps,
} from '@kbn/shared-ux-page-analytics-no-data-types';
import { withSuspense } from '@kbn/shared-ux-utility';
import useAsyncFn, { AsyncState } from 'react-use/lib/useAsyncFn';
import useMount from 'react-use/lib/useMount';
import { DataView } from '@kbn/data-views-plugin/common';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  InternalStateProvider,
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
} from './state_management/redux';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { RootProfileState, useRootProfile } from '../../context_awareness';
import { useDefaultAdHocDataViews2 } from '../../context_awareness/hooks/use_default_ad_hoc_data_views';
import { DiscoverError } from '../../components/common/error_alert';

export interface MainRoute2Props {
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
  customizationContext: DiscoverCustomizationContext;
}

interface MainInitializationState {
  hasESData: boolean;
  hasUserDataView: boolean;
}

type InitializeMain = (
  overrides?: MainInitializationState & {
    dataView?: DataView;
  }
) => Promise<MainInitializationState>;

type NarrowAsyncState<T> = Exclude<AsyncState<T>, { error?: undefined; value?: undefined }>;

export const DiscoverMainRoute2 = ({
  customizationCallbacks = [],
  customizationContext,
  stateStorageContainer,
}: MainRoute2Props) => {
  const services = useDiscoverServices();
  const rootProfileState = useRootProfile();
  const history = useHistory();
  const [stateStorage] = useState(
    () =>
      stateStorageContainer ??
      createKbnUrlStateStorage({
        useHash: services.uiSettings.get('state:storeInSessionStorage'),
        history,
        useHashQuery: customizationContext.displayMode !== 'embedded',
        ...withNotifyOnErrors(services.core.notifications.toasts),
      })
  );
  const [runtimeStateManager] = useState(() => createRuntimeStateManager());
  const [internalState] = useState(() =>
    createInternalStateStore({ services, runtimeStateManager })
  );
  const [initializationState, initializeMain] = useAsyncFn<InitializeMain>(
    async (overrides) => {
      const { dataViews } = services;
      const shouldRefreshDataViews = !overrides || Boolean(overrides.dataView);
      const [hasESData, hasUserDataView, defaultDataViewExists, savedDataViews] = await Promise.all(
        [
          overrides?.hasESData ?? dataViews.hasData.hasESData().catch(() => false),
          overrides?.hasUserDataView ?? dataViews.hasData.hasUserDataView().catch(() => false),
          overrides?.hasUserDataView ?? dataViews.defaultDataViewExists().catch(() => false),
          services.dataViews.getIdsWithTitle(shouldRefreshDataViews).catch(() => []),
        ]
      );

      internalState.dispatch(internalStateActions.setSavedDataViews(savedDataViews));

      if (overrides?.dataView) {
        internalState.dispatch(internalStateActions.setDataView(overrides.dataView));
      }

      return {
        hasESData,
        hasUserDataView: hasUserDataView && defaultDataViewExists,
      };
    },
    [internalState, services],
    { loading: true }
  );
  const mainInitializationState = initializationState as NarrowAsyncState<MainInitializationState>;

  useMount(() => {
    initializeMain();
  });

  if (rootProfileState.rootProfileLoading || mainInitializationState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (mainInitializationState.error) {
    return <DiscoverError error={mainInitializationState.error} />;
  }

  if (!mainInitializationState.value.hasESData) {
    return (
      <NoDataPage
        {...mainInitializationState.value}
        onDataViewCreated={() => {
          // This is unused if there is no ES data
        }}
      />
    );
  }

  return (
    <InternalStateProvider store={internalState}>
      <rootProfileState.AppWrapper>
        <DiscoverSessionView
          rootProfileState={rootProfileState}
          mainInitializationState={mainInitializationState.value}
          initializeMain={initializeMain}
        />
      </rootProfileState.AppWrapper>
    </InternalStateProvider>
  );
};

interface DiscoverSessionViewProps {
  rootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>;
  mainInitializationState: MainInitializationState;
  initializeMain: InitializeMain;
}

const DiscoverSessionView = ({
  rootProfileState,
  mainInitializationState,
  initializeMain,
}: DiscoverSessionViewProps) => {
  const { id: discoverSessionId } = useParams<{ id: string }>();
  const { initializeProfileDataViews } = useDefaultAdHocDataViews2({ rootProfileState });
  const isEsqlMode = false;

  if (!isEsqlMode && !mainInitializationState.hasUserDataView) {
    return (
      <NoDataPage
        {...mainInitializationState}
        onDataViewCreated={(dataView) => {
          initializeMain({
            hasESData: true,
            hasUserDataView: true,
            dataView: dataView as DataView,
          });
        }}
        onESQLNavigationComplete={() => {
          initializeMain({
            hasESData: true,
            hasUserDataView: true,
          });
        }}
      />
    );
  }

  const initializeSession = async () => {
    // Initialize profile data views
    await initializeProfileDataViews();

    // No data check

    // Load saved search if exists

    // Set breadrcumbs

    return () => {};
  };

  return <p>HELLO I WORK!</p>;
};

const importNoData = () => import('@kbn/shared-ux-page-analytics-no-data');
const AnalyticsNoDataPageKibanaProvider = withSuspense(
  lazy(async () => ({ default: (await importNoData()).AnalyticsNoDataPageKibanaProvider }))
);
const AnalyticsNoDataPage = withSuspense(
  lazy(async () => ({ default: (await importNoData()).AnalyticsNoDataPage }))
);

const NoDataPage = ({
  hasESData,
  hasUserDataView,
  onDataViewCreated,
  onESQLNavigationComplete,
}: MainInitializationState & AnalyticsNoDataPageProps) => {
  const services = useDiscoverServices();
  const noDataDependencies = useMemo<AnalyticsNoDataPageKibanaDependencies>(
    () => ({
      ...services,
      coreStart: services.core,
      dataViews: {
        ...services.dataViews,
        hasData: {
          ...services.dataViews.hasData,
          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(hasESData),
          hasUserDataView: () => Promise.resolve(hasUserDataView),
        },
      },
    }),
    [hasESData, hasUserDataView, services]
  );

  return (
    <AnalyticsNoDataPageKibanaProvider {...noDataDependencies}>
      <AnalyticsNoDataPage
        onDataViewCreated={onDataViewCreated}
        onESQLNavigationComplete={onESQLNavigationComplete}
      />
    </AnalyticsNoDataPageKibanaProvider>
  );
};

const BrandedLoadingIndicator = () => {
  const { core } = useDiscoverServices();
  const hasCustomBranding = useObservable(core.customBranding.hasCustomBranding$, false);

  return <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />;
};
