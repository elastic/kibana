/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaContextProvider, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { I18nProvider, FormattedRelative } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  TableListViewKibanaProvider,
  TableListViewKibanaDependencies,
} from '@kbn/content-management-table-list';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StartDependencies } from './types';
import { App } from './app';

const queryClient = new QueryClient();

export const mountManagementSection = (
  coreStart: CoreStart,
  startDeps: StartDependencies,
  { element }: ManagementAppMountParams
) => {
  ReactDOM.render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TableListViewKibanaProvider
          {...{
            core: coreStart as unknown as TableListViewKibanaDependencies['core'],
            toMountPoint,
            FormattedRelative,
          }}
        >
          <KibanaContextProvider
            services={{ filesClient: startDeps.files.filesClientFactory.asUnscoped() }}
          >
            <App />
          </KibanaContextProvider>
        </TableListViewKibanaProvider>
      </QueryClientProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
