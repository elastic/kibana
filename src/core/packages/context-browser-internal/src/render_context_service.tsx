/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { RenderContextService as IRenderContextService } from '@kbn/render-context-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React from 'react';

/**
 * Startup services needed for rendering fully-featured React nodes in Kibana
 */
interface RenderingServiceDeps {
  analytics: AnalyticsServiceStart;
  executionContext: ExecutionContextStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

/**
 * Carries startup services in internal state and can add the necessary context for out-of-current React
 * rendering, such as using `ReactDOM.render()`.
 *
 * Usage:
 *
 * export const renderApp = (core: CoreStart, props: Props, element: HTMLElement) => {
 *   const { rendering } = core; // obtain instance of RenderContextService from CoreStart
 *   ReactDOM.render(rendering.addContext(<MyApp {...props} />), element);
 *   return () => ReactDOM.unmountComponentAtNode(element);
 * };
 *
 */
export class RenderContextService implements IRenderContextService {
  private deps?: RenderingServiceDeps;

  start(deps: RenderingServiceDeps) {
    this.deps = deps;
  }

  public addContext(element: React.ReactNode) {
    if (!this.deps) {
      throw new Error('RenderContextService start method was not called!');
    }

    return (
      <KibanaRenderContextProvider
        analytics={this.deps.analytics}
        executionContext={this.deps.executionContext}
        i18n={this.deps.i18n}
        theme={this.deps.theme}
        userProfile={this.deps.userProfile}
      >
        {element}
      </KibanaRenderContextProvider>
    );
  }
}
