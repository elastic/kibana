/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MyPluginComponent } from './app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  security: SecurityPluginSetup;
  features: FeaturesPluginSetup;
}

interface StartDeps {
  security: SecurityPluginStart;
}

export class EsoModelVersionExample implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(coreSetup: CoreSetup<StartDeps>, deps: SetupDeps) {
    coreSetup.application.register({
      id: 'esoModelVersionExample',
      title: 'ESO Model Version Example',
      async mount({ element }: AppMountParameters) {
        const [coreStart] = await coreSetup.getStartServices();
        ReactDOM.render(
          <KibanaPageTemplate>
            <KibanaContextProvider services={{ ...coreStart, ...deps }}>
              <MyPluginComponent />
            </KibanaContextProvider>
          </KibanaPageTemplate>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
    deps.developerExamples.register({
      appId: 'esoModelVersionExample',
      title: 'ESO Model Version Example',
      description: 'Example of encrypted saved object with model version implementation',
    });
  }

  public start(core: CoreStart, deps: StartDeps) {
    return {};
  }

  public stop() {}
}
export const plugin = () => new EsoModelVersionExample();
