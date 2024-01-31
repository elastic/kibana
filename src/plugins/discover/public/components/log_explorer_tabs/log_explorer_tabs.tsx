/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { AllDatasetsLocatorParams, ALL_DATASETS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import { DiscoverAppLocatorParams, DISCOVER_APP_LOCATOR } from '../../../common';
import type { DiscoverServices } from '../../build_services';

export interface LogExplorerTabsProps {
  services: Pick<DiscoverServices, 'share'>;
  selectedTab: 'discover' | 'log-explorer';
}

const emptyParams = {};

export const LogExplorerTabs = ({ services, selectedTab }: LogExplorerTabsProps) => {
  const { euiTheme } = useEuiTheme();
  const locators = services.share?.url.locators;
  const discoverLocator = locators?.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const logExplorerLocator = locators?.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);
  const discoverUrl = discoverLocator?.getRedirectUrl(emptyParams);
  const logExplorerUrl = logExplorerLocator?.getRedirectUrl(emptyParams);

  const navigateToDiscover = createNavigateHandler(() => {
    if (selectedTab !== 'discover') {
      discoverLocator?.navigate(emptyParams);
    }
  });

  const navigateToLogExplorer = createNavigateHandler(() => {
    if (selectedTab !== 'log-explorer') {
      logExplorerLocator?.navigate(emptyParams);
    }
  });

  return (
    <EuiTabs bottomBorder={false} data-test-subj="logsExplorerTabs">
      <EuiTab
        isSelected={selectedTab === 'discover'}
        href={discoverUrl}
        onClick={navigateToDiscover}
        css={{ '.euiTab__content': { lineHeight: euiTheme.size.xxxl } }}
        data-test-subj="discoverTab"
      >
        {i18n.translate('discover.logsExplorerTabs.discover', {
          defaultMessage: 'Discover',
        })}
      </EuiTab>
      <EuiTab
        isSelected={selectedTab === 'log-explorer'}
        href={logExplorerUrl}
        onClick={navigateToLogExplorer}
        css={{ '.euiTab__content': { lineHeight: euiTheme.size.xxxl } }}
        data-test-subj="logsExplorerTab"
      >
        {i18n.translate('discover.logsExplorerTabs.logsExplorer', {
          defaultMessage: 'Logs Explorer',
        })}
      </EuiTab>
    </EuiTabs>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogExplorerTabs;

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
