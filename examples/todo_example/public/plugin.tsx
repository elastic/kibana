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
import { I18nProvider } from '@kbn/i18n-react';
import { App } from './components/app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class ToDoPlugin implements Plugin<void, void, SetupDeps> {
  public async setup(core: CoreSetup, deps: SetupDeps) {
    const { http, notifications } = core;

    core.application.register({
      id: 'todo',
      title: 'My Todo List',
      async mount({ element }: AppMountParameters) {
        ReactDOM.render(
          <I18nProvider>
            <App http={http} notifications={notifications} />
          </I18nProvider>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    deps.developerExamples.register({
      appId: 'todo',
      title: 'To Do Application',
      description: `Build a plugin that registers a To Do application.`,
    });
  }
  public start(_core: CoreStart) {
    return {};
  }
  public stop() {}
}
