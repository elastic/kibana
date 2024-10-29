/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { BfetchExplorerStartPlugins, ExplorerService } from './plugin';
import { App } from './containers/app';

export interface BfetchDeps {
  appBasePath: string;
  core: CoreStart;
  plugins: BfetchExplorerStartPlugins;
  explorer: ExplorerService;
}

export const mount =
  (coreSetup: CoreSetup<BfetchExplorerStartPlugins>, explorer: ExplorerService) =>
  async ({ appBasePath, element }: AppMountParameters) => {
    const [core, plugins] = await coreSetup.getStartServices();
    const deps: BfetchDeps = { appBasePath, core, plugins, explorer };
    const reactElement = (
      <KibanaRenderContextProvider {...core}>
        <KibanaContextProvider services={deps}>
          <App />
        </KibanaContextProvider>
      </KibanaRenderContextProvider>
    );
    render(reactElement, element);
    return () => unmountComponentAtNode(element);
  };
