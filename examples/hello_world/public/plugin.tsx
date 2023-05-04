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

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class HelloWorldPlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, deps: SetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'helloWorld',
      title: 'Hello World',
      async mount({ element }: AppMountParameters) {
        ReactDOM.render(<div data-test-subj="helloWorldDiv">Hello World!</div>, element);
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    // This section is only needed to get this example plugin to show up in our Developer Examples.
    deps.developerExamples.register({
      appId: 'helloWorld',
      title: 'Hello World Application',
      description: `Build a plugin that registers an application that simply says "Hello World"`,
    });
  }
  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
