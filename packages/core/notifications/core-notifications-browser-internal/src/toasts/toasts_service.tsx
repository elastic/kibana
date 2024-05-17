/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { GlobalToastList } from './global_toast_list';
import { ToastsApi } from './toasts_api';
import { EventReporter } from './telemetry';

interface SetupDeps {
  uiSettings: IUiSettingsClient;
}

interface StartDeps {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  eventReporter: EventReporter;
  targetDomElement: HTMLElement;
}

export class ToastsService {
  private api?: ToastsApi;
  private root?: HTMLElement;

  public setup({ uiSettings }: SetupDeps) {
    this.api = new ToastsApi({ uiSettings });
    return this.api!;
  }

  public start({ eventReporter, analytics, i18n, overlays, theme, targetDomElement }: StartDeps) {
    this.api!.start({ overlays, i18n, theme });
    this.root = createRoot(targetDomElement);

    this.root.render(
      <KibanaRenderContextProvider analytics={analytics} i18n={i18n} theme={theme}>
        <GlobalToastList
          dismissToast={(toastId: string) => this.api!.remove(toastId)}
          toasts$={this.api!.get$()}
          reportEvent={eventReporter}
        />
      </KibanaRenderContextProvider>
    );

    return this.api!;
  }

  public stop() {
    if (this.targetDomElement) {
      this.root.unmount();
      this.targetDomElement.textContent = '';
    }
  }
}
