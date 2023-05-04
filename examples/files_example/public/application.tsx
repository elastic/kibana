/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { FilesExampleApp } from './components/app';
import { FilesContext } from './imports';

const queryClient = new QueryClient();

export const renderApp = (
  { notifications }: CoreStart,
  { files }: AppPluginStartDependencies,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    <QueryClientProvider client={queryClient}>
      <FilesContext client={files.unscoped}>
        <FilesExampleApp files={files} notifications={notifications} />
      </FilesContext>
    </QueryClientProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
