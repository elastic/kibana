/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { Subscription } from 'rxjs';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { showErrorDialog, ToastsService } from './toasts';
import { EventReporter, eventTypes } from './toasts/telemetry';

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
  uiSettings: IUiSettingsClient;
}

export interface StartDeps {
  i18n: I18nStart;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  analytics: AnalyticsServiceStart;
  targetDomElement: HTMLElement;
}

/** @public */
export class NotificationsService {
  private readonly toasts: ToastsService;
  private uiSettingsErrorSubscription?: Subscription;
  private targetDomElement?: HTMLElement;

  constructor() {
    this.toasts = new ToastsService();
  }

  public setup({ uiSettings, analytics }: SetupDeps): NotificationsSetup {
    eventTypes.forEach((eventType) => {
      analytics.registerEventType(eventType);
    });

    const notificationSetup = { toasts: this.toasts.setup({ uiSettings }) };

    this.uiSettingsErrorSubscription = uiSettings.getUpdateErrors$().subscribe((error: Error) => {
      notificationSetup.toasts.addDanger({
        title: i18n.translate('core.notifications.unableUpdateUISettingNotificationMessageTitle', {
          defaultMessage: 'Unable to update UI setting',
        }),
        text: error.message,
      });
    });

    return notificationSetup;
  }

  public start({
    analytics,
    i18n: i18nDep,
    overlays,
    theme,
    targetDomElement,
  }: StartDeps): NotificationsStart {
    this.targetDomElement = targetDomElement;
    const toastsContainer = document.createElement('div');
    targetDomElement.appendChild(toastsContainer);

    const eventReporter = new EventReporter({ analytics });

    return {
      toasts: this.toasts.start({
        eventReporter,
        i18n: i18nDep,
        overlays,
        analytics,
        theme,
        targetDomElement: toastsContainer,
      }),
      showErrorDialog: ({ title, error }) =>
        showErrorDialog({
          title,
          error,
          openModal: overlays.openModal,
          analytics,
          i18n: i18nDep,
          theme,
        }),
    };
  }

  public stop() {
    this.toasts.stop();

    if (this.targetDomElement) {
      this.targetDomElement.textContent = '';
    }

    if (this.uiSettingsErrorSubscription) {
      this.uiSettingsErrorSubscription.unsubscribe();
    }
  }
}

/**
 * @public {@link NotificationsService}
 */
export type NotificationsServiceContract = PublicMethodsOf<NotificationsService>;
