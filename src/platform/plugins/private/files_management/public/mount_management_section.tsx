/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import { Route } from '@kbn/shared-ux-router';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { FormattedRelative } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StartDependencies } from './types';
import { App } from './app';
import { FilesManagementAppContextProvider } from './context';

const queryClient = new QueryClient();

export const mountManagementSection = (
  coreStart: CoreStart,
  startDeps: StartDependencies,
  { element, history }: ManagementAppMountParams
) => {
  const {
    files: { filesClientFactory, getAllFindKindDefinitions, getFileKindDefinition },
  } = startDeps;

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <QueryClientProvider client={queryClient}>
        <TableListViewKibanaProvider
          {...{
            core: coreStart,
            FormattedRelative,
          }}
        >
          <FilesManagementAppContextProvider
            filesClient={filesClientFactory.asUnscoped()}
            getFileKindDefinition={getFileKindDefinition}
            getAllFindKindDefinitions={getAllFindKindDefinitions}
          >
            <Router history={history}>
              <Route path="/" component={App} />
            </Router>
          </FilesManagementAppContextProvider>
        </TableListViewKibanaProvider>
      </QueryClientProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
