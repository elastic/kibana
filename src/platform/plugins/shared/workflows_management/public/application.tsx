/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { WorkflowsRoutes } from './routes';
import type { WorkflowsServices } from './types';

const queryClient = new QueryClient();

export const renderApp = (
  services: WorkflowsServices,
  { history, element }: AppMountParameters
) => {
  const { theme } = services;

  ReactDOM.render(
    <KibanaThemeProvider theme={theme}>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>
          <WorkflowsRoutes history={history} />
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
