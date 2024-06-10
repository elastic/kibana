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
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { PLUGIN_NAME } from '../common/constants';
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

    core.chrome.setBreadcrumbs([
      {
        text: 'Developer examples',
        href: `/app/developerExamples`,
        onClick: (e) => {
          e.preventDefault();
          core.application.navigateToApp('developerExamples');
        },
      },
      {
        text: PLUGIN_NAME,
      },
    ]);

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
