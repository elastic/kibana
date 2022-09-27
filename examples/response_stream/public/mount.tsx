/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { CoreSetup, CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ResponseStreamStartPlugins } from './plugin';
import { App } from './containers/app';

export interface ResponseStreamDeps {
  appBasePath: string;
  core: CoreStart;
  plugins: ResponseStreamStartPlugins;
}

export const mount =
  (coreSetup: CoreSetup<ResponseStreamStartPlugins>) =>
  async ({ appBasePath, element }: AppMountParameters) => {
    const [core, plugins] = await coreSetup.getStartServices();
    const deps: ResponseStreamDeps = { appBasePath, core, plugins };
    const reactElement = (
      <KibanaContextProvider services={deps}>
        <App />
      </KibanaContextProvider>
    );
    const root = createRoot(element);
    root.render(reactElement);
    return () => root.unmount();
  };
