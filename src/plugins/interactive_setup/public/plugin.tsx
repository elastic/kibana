/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';

import { I18nProvider } from '@kbn/i18n/react';
import type { CoreSetup, CoreStart, HttpSetup, Plugin } from 'src/core/public';

import { App } from './app';
import { HttpProvider } from './use_http';

export class InteractiveSetupPlugin implements Plugin<void, void, {}, {}> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'interactiveSetup',
      title: 'Configure Elastic to get started',
      appRoute: '/',
      chromeless: true,
      mount: (params) => {
        ReactDOM.render(
          <Providers http={core.http}>
            <App />
          </Providers>,
          params.element
        );
        return () => ReactDOM.unmountComponentAtNode(params.element);
      },
    });
  }

  public start(core: CoreStart) {}
}

export interface ProvidersProps {
  http: HttpSetup;
}

export const Providers: FunctionComponent<ProvidersProps> = ({ http, children }) => (
  <I18nProvider>
    <HttpProvider http={http}>{children}</HttpProvider>
  </I18nProvider>
);
