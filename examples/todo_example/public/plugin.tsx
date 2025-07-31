/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class ToDoPlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, deps: SetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'todo',
      title: 'My Todo List',
      async mount({ element }: AppMountParameters) {
        ReactDOM.render(<div data-test-subj="todoDiv">My Todo List!</div>, element);
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
    // This section is only needed to get this example plugin to show up in our Developer Examples.
    deps.developerExamples.register({
      appId: 'todo',
      title: 'To Do Application',
      description: `Build a plugin that registers a To Do application.`,
    });
  }
  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
