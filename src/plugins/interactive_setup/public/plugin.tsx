/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

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
      mount: async ({ element }) => {
        const url = new URL(window.location.href);
        const defaultCode = url.searchParams.get('code') || undefined;
        const onSuccess = () => {
          url.searchParams.delete('code');
          window.location.replace(url.href);
        };
        const [services] = await core.getStartServices();
        const root = createRoot(element);
        root.render(
          <Providers defaultCode={defaultCode} services={services}>
            <App onSuccess={onSuccess} />
          </Providers>
        );
        return () => root.unmount();
      },
    });
  }

  public start(_core: CoreStart) {}
}

export interface ProvidersProps {
  services: CoreStart;
  defaultCode?: string;
  children: React.ReactNode;
}

export const Providers: FC<PropsWithChildren<ProvidersProps>> = ({
  defaultCode,
  services,
  children,
}) => (
  <KibanaRenderContextProvider {...services}>
    <KibanaProvider services={services}>
      <VerificationProvider defaultCode={defaultCode}>{children}</VerificationProvider>
    </KibanaProvider>
  </KibanaRenderContextProvider>
);
