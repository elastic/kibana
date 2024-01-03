/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import { AddDataPrompt } from '@kbn/shared-ux-prompt-add-data';
import React from 'react';
import { EmptyIndexListPrompt } from '../empty_index_list_prompt';
import type { DataViewTableController } from './data_view_table_controller';

/**
 * @internal
 */
export interface NoDataProps {
  docLinks: DocLinksStart;
  uiSettings: IUiSettingsClient;
  application: ApplicationStart;
  dataViewController: DataViewTableController;
  setShowCreateDialog: React.Dispatch<React.SetStateAction<boolean>>;
  noDataPage?: NoDataPagePluginStart;
}

const NoDataServerlessSearch: React.FC<
  Pick<NoDataProps, 'noDataPage' | 'uiSettings' | 'docLinks'>
> = ({ noDataPage, uiSettings, docLinks }) => {
  const { hasApiKeys, error, loading } = noDataPage?.useHasApiKeys() ?? {};

  if (error) {
    throw error;
  }

  if (loading) {
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
  uiSettings,
  docLinks,
  application,
  dataViewController,
  setShowCreateDialog,
}) => {
  const flavor = noDataPage?.getAnalyticsNoDataPageFlavor() ?? 'kibana';

  switch (flavor) {
    case 'serverless_search': {
      return (
        <NoDataServerlessSearch
          noDataPage={noDataPage}
          uiSettings={uiSettings}
          docLinks={docLinks}
        />
      );
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
