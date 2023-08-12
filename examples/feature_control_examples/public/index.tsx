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
import { MyPluginComponent } from './app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  security: SecurityPluginSetup;
}

interface StartDeps {
  security: SecurityPluginStart;
}

export class FeatureControlsPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'featureControlsExamples',
      title: 'FeatureControlExamples',
      async mount({ element }: AppMountParameters) {
        ReactDOM.render(
          <KibanaPageTemplate>
            <KibanaPageTemplate.Header pageTitle="User profile components" />
            <MyPluginComponent />
          </KibanaPageTemplate>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    deps.developerExamples.register({
      appId: 'featureControlsExamples',
      title: 'featureControlsExamples',
      description: 'Demo of how to implement featureControlsExamples',
    });
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
export const plugin = () => new FeatureControlsPlugin();
