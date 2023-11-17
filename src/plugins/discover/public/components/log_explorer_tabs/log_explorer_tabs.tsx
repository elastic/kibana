/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { DataViewSpec } from '@kbn/data-views-plugin/public';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
  RefreshInterval,
} from '@kbn/deeplinks-observability';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import React, { MouseEvent } from 'react';
import { DiscoverAppLocatorParams, DISCOVER_APP_LOCATOR } from '../../../common';

export interface LogExplorerTabsParams {
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;
  query?: Query | AggregateQuery;
  columns?: string[];
  sort?: string[][];
  filters?: Filter[];
  dataViewSpec?: DataViewSpec;
}

export interface LogExplorerTabsProps {
  locators: LocatorClient;
  params: LogExplorerTabsParams;
  selectedTab: 'discover' | 'log-explorer';
}

export const LogExplorerTabs = ({ locators, params, selectedTab }: LogExplorerTabsProps) => {
  const { euiTheme } = useEuiTheme();
  const discoverLocator = locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const logExplorerLocator = locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);
  const discoverUrl = discoverLocator?.getRedirectUrl({ ...params });
  const logExplorerUrl = logExplorerLocator?.getRedirectUrl({ ...params });
  const navigateToDiscover = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    discoverLocator?.navigate({ ...params });
  };
  const navigateToLogExplorer = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logExplorerLocator?.navigate({ ...params });
  };

  return (
    <EuiTabs bottomBorder={false}>
      <EuiTab
        isSelected={selectedTab === 'discover'}
        href={discoverUrl}
        onClick={selectedTab === 'discover' ? undefined : navigateToDiscover}
        css={{ '.euiTab__content': { lineHeight: euiTheme.size.xxxl } }}
      >
        {i18n.translate('discover.logExplorerTabs.dataViews', {
          defaultMessage: 'Data Views',
        })}
      </EuiTab>
      <EuiTab
        isSelected={selectedTab === 'log-explorer'}
        href={logExplorerUrl}
        onClick={selectedTab === 'log-explorer' ? undefined : navigateToLogExplorer}
        css={{ '.euiTab__content': { lineHeight: euiTheme.size.xxxl } }}
      >
        {i18n.translate('discover.logExplorerTabs.logExplorer', {
          defaultMessage: 'Log Explorer',
        })}
      </EuiTab>
    </EuiTabs>
  );
};
