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
import type { ReactElementService as IReactElementService } from '@kbn/core-rendering-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React from 'react';

interface RenderingServiceDeps {
  analytics: AnalyticsServiceStart;
  executionContext: ExecutionContextStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

export class ReactElementService implements IReactElementService {
  private deps?: RenderingServiceDeps;

  start(deps: RenderingServiceDeps) {
    this.deps = deps;
  }

  public wrapReact(element: React.ReactNode) {
    if (!this.deps) {
      throw new Error('start method was not called!');
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
