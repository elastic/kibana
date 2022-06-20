/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import type { ExpressionsServiceSetup } from '@kbn/expressions-plugin';
import { ExpressionsServiceFork } from '@kbn/expressions-plugin/common/service/expressions_fork';
import { AppMountParameters, AppNavLinkStatus, CoreSetup, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { App, ExpressionsContext } from './app';
import { countEvent, getEvents, pluck } from './functions';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  expressions: ExpressionsServiceSetup;
}

export class PartialResultsExamplePlugin implements Plugin<void, void, SetupDeps> {
  private expressions?: ExpressionsServiceFork;

  setup({ application }: CoreSetup, { expressions, developerExamples }: SetupDeps) {
    this.expressions = expressions.fork('test');
    const expressionsSetup = this.expressions.setup();
    expressionsSetup.registerFunction(countEvent);
    expressionsSetup.registerFunction(getEvents);
    expressionsSetup.registerFunction(pluck);
    const expressionsStart = this.expressions.start();

    application.register({
      id: 'partialResultsExample',
      title: 'Partial Results Example',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async ({ element }: AppMountParameters) => {
        ReactDOM.render(
          <ExpressionsContext.Provider value={expressionsStart}>
            <App />
          </ExpressionsContext.Provider>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    developerExamples.register({
      appId: 'partialResultsExample',
      title: 'Partial Results Example',
      description: 'Learn how to use partial results in the expressions plugin.',
    });
  }

  start() {
    return {};
  }

  stop() {}
}
