/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';

import type { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { I18nProvider } from '@kbn/i18n/react';
import { Router } from 'react-router-dom';
import type { History } from 'history';
import { App } from './app';
import { KibanaContextProvider } from '../../kibana_react/public';

export class UserSetupPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'userSetup',
      title: 'User Setup',
      chromeless: true,
      mount: async ({ element, history }) => {
        const [[coreStart]] = await Promise.all([core.getStartServices()]);

        ReactDOM.render(
          <Providers services={coreStart} history={history}>
            <App />
          </Providers>,
          element
        );

        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  }

  public start(core: CoreStart) {}
}

export interface ProvidersProps {
  services: CoreStart;
  history: History;
}

export const Providers: FunctionComponent<ProvidersProps> = ({ services, history, children }) => (
  <KibanaContextProvider services={services}>
    <I18nProvider>
      <Router history={history}>{children}</Router>
    </I18nProvider>
  </KibanaContextProvider>
);
