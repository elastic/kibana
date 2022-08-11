/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { PluginBApp } from './components/app';
import { rpc } from './rpc';

export const renderApp = (
  { notifications, http }: CoreStart,
  { navigation }: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  const queryClient = new QueryClient();
  const trpcClient = rpc.createClient({
    url: 'http://localhost:5601/rpc',
    headers: {
      'kbn-xsrf': 'true',
      authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
    },
  });

  ReactDOM.render(
    <rpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PluginBApp
          basename={appBasePath}
          notifications={notifications}
          http={http}
          navigation={navigation}
        />
      </QueryClientProvider>
    </rpc.Provider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
