/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { AllDatasetsLocatorParams, ALL_DATASETS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';
import { DiscoverAppLocatorParams, DISCOVER_APP_LOCATOR } from '../../../common';
import type { DiscoverServices } from '../../build_services';

export interface LogExplorerTabsParams {
  columns?: string[];
  sort?: string[][];
  dataViewSpec?: DataViewSpec;
}

export interface LogExplorerTabsProps {
  services: Pick<DiscoverServices, 'share' | 'data'>;
  params: LogExplorerTabsParams;
  selectedTab: 'discover' | 'log-explorer';
}

export const LogExplorerTabs = ({ services, params, selectedTab }: LogExplorerTabsProps) => {
  const { euiTheme } = useEuiTheme();
  const { share, data } = services;
  const locators = share?.url.locators;
  const {
    time: timeRange,
    refreshInterval,
    query,
    filters,
  } = useObservable(data.query.state$.pipe(map(({ state }) => state)), data.query.getState());
  const mergedParams = { ...params, timeRange, refreshInterval, query, filters };
  const discoverLocator = locators?.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const logExplorerLocator = locators?.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);
  const discoverUrl = discoverLocator?.getRedirectUrl(mergedParams);
  const logExplorerUrl = logExplorerLocator?.getRedirectUrl(mergedParams);

  const navigateToDiscover = createNavigateHandler(() => {
    if (selectedTab !== 'discover') {
      discoverLocator?.navigate(mergedParams);
    }
  });

  const navigateToLogExplorer = createNavigateHandler(() => {
    if (selectedTab !== 'log-explorer') {
      logExplorerLocator?.navigate(mergedParams);
    }
  });

  return (
    <EuiTabs bottomBorder={false}>
      <EuiTab
        isSelected={selectedTab === 'discover'}
        href={discoverUrl}
        onClick={navigateToDiscover}
        css={{ '.euiTab__content': { lineHeight: euiTheme.size.xxxl } }}
      >
        {i18n.translate('discover.logExplorerTabs.discover', {
          defaultMessage: 'Discover',
        })}
      </EuiTab>
      <EuiTab
        isSelected={selectedTab === 'log-explorer'}
        href={logExplorerUrl}
        onClick={navigateToLogExplorer}
        css={{ '.euiTab__content': { lineHeight: euiTheme.size.xxxl } }}
      >
        {i18n.translate('discover.logExplorerTabs.logExplorer', {
          defaultMessage: 'Logs Explorer',
        })}
      </EuiTab>
    </EuiTabs>
  );
};

const isModifiedEvent = (event: MouseEvent) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

const isLeftClickEvent = (event: MouseEvent) => event.button === 0;

const createNavigateHandler = (onClick: () => void) => (e: MouseEvent) => {
  if (isModifiedEvent(e) || !isLeftClickEvent(e)) {
    return;
  }

  e.preventDefault();
  onClick();
};
