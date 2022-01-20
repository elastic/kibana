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

import { I18nProvider } from '@kbn/i18n-react';
import type { CoreSetup, CoreStart, Plugin } from 'src/core/public';

import { App } from './app';
import { KibanaProvider } from './use_kibana';
import { VerificationProvider } from './use_verification';

export class InteractiveSetupPlugin implements Plugin<void, void, {}, {}> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'interactiveSetup',
      title: 'Configure Elastic to get started',
      appRoute: '/',
      chromeless: true,
      mount: async (params) => {
        const url = new URL(window.location.href);
        const defaultCode = url.searchParams.get('code') || undefined;
        const onSuccess = () => {
          url.searchParams.delete('code');
          window.location.replace(url.href);
        };
        const [services] = await core.getStartServices();

        ReactDOM.render(
          <Providers defaultCode={defaultCode} services={services}>
            <App onSuccess={onSuccess} />
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
  services: CoreStart;
  defaultCode?: string;
}

export const Providers: FunctionComponent<ProvidersProps> = ({
  defaultCode,
  services,
  children,
}) => (
  <I18nProvider>
    <KibanaProvider services={services}>
      <VerificationProvider defaultCode={defaultCode}>{children}</VerificationProvider>
    </KibanaProvider>
  </I18nProvider>
);
