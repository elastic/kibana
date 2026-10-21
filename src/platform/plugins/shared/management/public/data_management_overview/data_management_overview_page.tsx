/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '../types';
import { ResourcesTable } from './resources_table';

const pageTitle = i18n.translate('management.dataManagementOverview.pageTitle', {
  defaultMessage: 'Overview',
});

const pageDescription = i18n.translate('management.dataManagementOverview.pageDescription', {
  defaultMessage:
    'All data resources in one place, including indices, data streams, ES|QL views, datasets, and streams.',
});

export const DataManagementOverviewPage = ({
  getUrlForApp,
}: {
  getUrlForApp: CoreStart['application']['getUrlForApp'];
}) => (
  <div data-test-subj="dataManagementOverviewPage">
    <AppHeader description={pageDescription} spacing="bleed" title={pageTitle} />
    <EuiSpacer size="l" />
    <ResourcesTable getUrlForApp={getUrlForApp} />
  </div>
);

export const renderDataManagementOverview = (
  coreStart: CoreStart,
  { element, setBreadcrumbs }: ManagementAppMountParams
) => {
  coreStart.chrome.docTitle.change(pageTitle);
  setBreadcrumbs([{ text: pageTitle }]);

  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <DataManagementOverviewPage getUrlForApp={coreStart.application.getUrlForApp} />
    )
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    root.unmount();
  };
};
