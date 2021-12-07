/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import type { ExpressionsService, ExpressionsServiceSetup } from 'src/plugins/expressions';
import { AppMountParameters, AppNavLinkStatus, CoreSetup, Plugin } from '../../../src/core/public';
import type { DeveloperExamplesSetup } from '../../developer_examples/public';
import { App, ExpressionsContext } from './app';
import { countEvent, getEvents, pluck } from './functions';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  expressions: ExpressionsServiceSetup;
}

export class PartialResultsExamplePlugin implements Plugin<void, void, SetupDeps> {
  private expressions?: ExpressionsService;

  setup({ application }: CoreSetup, { expressions, developerExamples }: SetupDeps) {
    this.expressions = expressions.fork();
    this.expressions.registerFunction(countEvent);
    this.expressions.registerFunction(getEvents);
    this.expressions.registerFunction(pluck);

    application.register({
      id: 'partialResultsExample',
      title: 'Partial Results Example',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async ({ element }: AppMountParameters) => {
        ReactDOM.render(
          <ExpressionsContext.Provider value={this.expressions}>
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
