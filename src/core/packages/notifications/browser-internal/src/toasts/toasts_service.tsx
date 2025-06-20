/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { NotificationCoordinator } from '@kbn/core-notifications-browser';
import { GlobalToastList } from './global_toast_list';
import { ToastsApi } from './toasts_api';
import { ToastsTelemetry } from './telemetry';

interface SetupDeps {
  analytics: AnalyticsServiceSetup;
  uiSettings: IUiSettingsClient;
}

interface StartDeps {
  overlays: OverlayStart;
  rendering: RenderingService;
  analytics: AnalyticsServiceStart;
  targetDomElement: HTMLElement;
  notificationCoordinator: NotificationCoordinator;
}

export class ToastsService {
  private api?: ToastsApi;
  private targetDomElement?: HTMLElement;
  private readonly telemetry = new ToastsTelemetry();

  public setup({ uiSettings, analytics }: SetupDeps) {
    this.api = new ToastsApi({ uiSettings });
    this.telemetry.setup({ analytics });
    return this.api!;
  }

  public start({
    overlays,
    targetDomElement,
    rendering,
    analytics,
    notificationCoordinator,
  }: StartDeps) {
    this.api!.start({ overlays, rendering });
    this.targetDomElement = targetDomElement;

    const reportEvent = this.telemetry.start({ analytics });

    const coordinator = notificationCoordinator(ToastsService.name);

    const toasts$ = coordinator.optInToCoordination(this.api!.get$(), ({ locked, controller }) => {
      // new toasts will only be emitted when there are no locks, or when the current lock is owned by the toast service
      return !locked || controller === ToastsService.name;
    });

    render(
      rendering.addContext(
        <GlobalToastList
          dismissToast={(toastId: string) => this.api!.remove(toastId)}
          toasts$={toasts$}
          reportEvent={reportEvent}
        />
      ),
      targetDomElement
    );

    return this.api!;
  }

  public stop() {
    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
      this.targetDomElement.textContent = '';
    }
  }
}
