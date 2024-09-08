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

export class FeatureControlsPluginExample implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(coreSetup: CoreSetup<StartDeps>, deps: SetupDeps) {
    coreSetup.application.register({
      id: 'featureControlsExamples',
      title: 'FeatureControlExamples',
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
      appId: 'featureControlsExamples',
      title: 'Feature Control Examples',
      description: 'Demo of how to implement Feature Controls',
    });
  }

  public start(core: CoreStart, deps: StartDeps) {
    return {};
  }

  public stop() {}
}
export const plugin = () => new FeatureControlsPluginExample();
