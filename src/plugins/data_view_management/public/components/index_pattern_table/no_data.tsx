/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { EuiLoadingSpinner } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import { getHasApiKeys$ } from '@kbn/shared-ux-page-analytics-no-data';
import { HttpStart } from '@kbn/core-http-browser';
import { AddDataPrompt } from '../add_data_prompt';
import { EmptyIndexListPrompt } from '../empty_index_list_prompt';
import type { DataViewTableController } from './data_view_table_controller';

/**
 * @internal
 */
export interface NoDataProps {
  noDataPage?: NoDataPagePluginStart;
  docLinks: DocLinksStart;
  uiSettings: IUiSettingsClient;
  http: HttpStart;
  application: ApplicationStart;
  dataViewController: DataViewTableController;
  setShowCreateDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

const NoDataServerlessSearch: React.FC<Pick<NoDataProps, 'uiSettings' | 'http' | 'docLinks'>> = ({
  uiSettings,
  http,
  docLinks,
}) => {
  const { hasApiKeys, error, isLoading } =
    useObservable(useMemo(() => getHasApiKeys$(http), [http])) ?? {};

  if (error) {
    throw error;
  }

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  const addDataHref = hasApiKeys
    ? uiSettings.get('defaultRoute') + '#ingestData'
    : uiSettings.get('defaultRoute');

  return (
    <AddDataPrompt addDataHref={addDataHref} docLink={docLinks.links.indexPatterns.introduction} />
  );
};

/**
 * @internal
 */
export const NoData: React.FC<NoDataProps> = ({
  noDataPage,
  docLinks,
  http,
  uiSettings,
  application,
  dataViewController,
  setShowCreateDialog,
}) => {
  const flavor = noDataPage?.getAnalyticsNoDataPageFlavor() ?? 'kibana';

  switch (flavor) {
    case 'serverless_search': {
      return <NoDataServerlessSearch http={http} uiSettings={uiSettings} docLinks={docLinks} />;
    }

    default:
      return (
        <EmptyIndexListPrompt
          onRefresh={dataViewController.loadDataViews}
          createAnyway={() => setShowCreateDialog(true)}
          canSaveIndexPattern={!!application.capabilities.indexPatterns.save}
          navigateToApp={application.navigateToApp}
          addDataUrl={docLinks.links.indexPatterns.introduction}
        />
      );
  }
};
