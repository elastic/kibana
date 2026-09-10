/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SearchSessionsMgmtAPI } from '../lib/api';
import { SearchSessionsMgmtTable } from './table';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import type { SearchUsageCollector } from '../../../collectors';
import type { ISearchSessionEBTManager } from '../../ebt_manager';

interface Props {
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  timezone: string;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  share: SharePluginStart;
  searchUsageCollector: SearchUsageCollector;
  searchSessionEBTManager: ISearchSessionEBTManager;
}

const pageTitle = i18n.translate('data.mgmt.searchSessions.main.backgroundSearchSectionTitle', {
  defaultMessage: 'Background Search',
});

const pageDescription = i18n.translate(
  'data.mgmt.searchSessions.main.backgroundSearchSectionDescription',
  { defaultMessage: 'Manage your background searches.' }
);

const refreshButtonLabel = i18n.translate('data.mgmt.searchSessions.search.tools.refresh', {
  defaultMessage: 'Refresh',
});

export function SearchSessionsMgmtMain({ share, ...tableProps }: Props) {
  const refreshRef = useRef<() => void>(() => undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefreshReady = useCallback((refresh: () => void) => {
    refreshRef.current = refresh;
  }, []);

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      primaryActionItem: {
        id: 'refresh',
        label: refreshButtonLabel,
        iconType: 'refresh',
        testId: 'sessionManagementRefreshBtn',
        run: () => {
          refreshRef.current();
        },
        isLoading: isRefreshing,
        disableButton: isRefreshing,
      },
    }),
    [isRefreshing]
  );

  return (
    <>
      <AppHeader title={pageTitle} description={pageDescription} menu={menu} spacing="bleed" />

      <EuiSpacer size="l" />
      <SearchSessionsMgmtTable
        data-test-subj="search-sessions-mgmt-table"
        locators={share.url.locators}
        trackingProps={{ renderedIn: 'management', openedFrom: 'management' }}
        {...tableProps}
        hideRefreshButton
        onRefreshReady={onRefreshReady}
        onRefreshLoadingChange={setIsRefreshing}
      />
    </>
  );
}
