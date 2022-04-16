/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
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
      <KibanaContextProvider services={deps}>
        <App />
      </KibanaContextProvider>
    );
    render(reactElement, element);
    return () => unmountComponentAtNode(element);
  };
