/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
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
  userProfile: UserProfileService;
  eventReporter: EventReporter;
  targetDomElement: HTMLElement;
}

export class ToastsService {
  private api?: ToastsApi;
  private root?: Root;

  public setup({ uiSettings }: SetupDeps) {
    this.api = new ToastsApi({ uiSettings });
    return this.api!;
  }

  public start({ eventReporter, overlays, targetDomElement, ...startDeps }: StartDeps) {
    this.api!.start({ overlays, ...startDeps });

    const root = createRoot(targetDomElement);
    this.root = root;

    root.render(
      <KibanaRenderContextProvider {...startDeps}>
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
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }
}
