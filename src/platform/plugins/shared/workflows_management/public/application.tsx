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
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { AppPluginStartDependencies } from './types';
import { WorkflowsRoutes } from './routes';

const queryClient = new QueryClient();

export const renderApp = (
  { notifications, http, chrome, application }: CoreStart,
  { navigation }: AppPluginStartDependencies,
  { history, element }: AppMountParameters
) => {
  chrome.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
    },
  ]);

  ReactDOM.render(
    <KibanaContextProvider services={{ notifications, http, chrome, application }}>
      <QueryClientProvider client={queryClient}>
        <WorkflowsRoutes history={history} />
      </QueryClientProvider>
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
