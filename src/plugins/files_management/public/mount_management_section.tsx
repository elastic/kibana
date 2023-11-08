/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import { Route } from '@kbn/shared-ux-router';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { KibanaThemeProvider, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { I18nProvider, FormattedRelative } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  TableListViewKibanaProvider,
  TableListViewKibanaDependencies,
} from '@kbn/content-management-table-list-view-table';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StartDependencies } from './types';
import { App } from './app';
import { FilesManagementAppContextProvider } from './context';
import { PLUGIN_ID } from '../common';

const queryClient = new QueryClient();

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const mountManagementSection = (
  coreStart: CoreStart,
  startDeps: StartDependencies,
  { element, history }: ManagementAppMountParams
) => {
  const {
    files: { filesClientFactory, getAllFindKindDefinitions, getFileKindDefinition },
    spaces,
  } = startDeps;

  const SpacesContextWrapper = spaces
    ? spaces.ui.components.getSpacesContextProvider
    : getEmptyFunctionComponent;

  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme$={coreStart.theme.theme$}>
        <SpacesContextWrapper feature={PLUGIN_ID}>
          <QueryClientProvider client={queryClient}>
            <TableListViewKibanaProvider
              {...{
                core: coreStart as unknown as TableListViewKibanaDependencies['core'],
                toMountPoint,
                FormattedRelative,
                spacesApi: spaces,
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
        </SpacesContextWrapper>
      </KibanaThemeProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
