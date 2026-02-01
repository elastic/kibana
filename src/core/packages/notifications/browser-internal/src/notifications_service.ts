/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import type * as Rx from 'rxjs';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { showErrorDialog, ToastsService } from './toasts';
import { Coordinator, notificationCoordinator } from './notification_coordinator';
import { FeedbackService } from './feedback';
import { ToursService } from './tours';

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
  uiSettings: IUiSettingsClient;
}

export interface StartDeps {
  overlays: OverlayStart;
  rendering: RenderingService;
  analytics: AnalyticsServiceStart;
  targetDomElement: HTMLElement;
  settings: SettingsStart;
}

/** @public */
export class NotificationsService {
  private readonly toasts: ToastsService;
  private readonly feedback: FeedbackService;
  private readonly tours: ToursService;
  private uiSettingsErrorSubscription?: Rx.Subscription;
  private targetDomElement?: HTMLElement;
  private readonly coordinator = notificationCoordinator.bind(new Coordinator());

  constructor() {
    this.toasts = new ToastsService();
    this.feedback = new FeedbackService();
    this.tours = new ToursService();
  }

  public setup({ uiSettings, analytics }: SetupDeps): NotificationsSetup {
    const notificationSetup = {
      coordinator: this.coordinator,
      toasts: this.toasts.setup({ uiSettings, analytics }),
    };

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
    overlays,
    targetDomElement,
    settings,
    ...startDeps
  }: StartDeps): NotificationsStart {
    this.targetDomElement = targetDomElement;
    const toastsContainer = document.createElement('div');
    targetDomElement.appendChild(toastsContainer);

    return {
      toasts: this.toasts.start({
        overlays,
        targetDomElement: toastsContainer,
        notificationCoordinator: this.coordinator,
        ...startDeps,
      }),
      showErrorDialog: ({ title, error }) =>
        showErrorDialog({
          title,
          error,
          openModal: overlays.openModal,
          ...startDeps,
        }),
      feedback: this.feedback.start({ settings }),
      tours: this.tours.start({ settings }),
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
