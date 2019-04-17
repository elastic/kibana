/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';

import { Observable, Subject, Subscription } from 'rxjs';
import { I18nSetup } from '../i18n';
import { ToastsService } from './toasts';
import { UiSettingsSetup } from '../ui_settings';

interface NotificationServiceParams {
  targetDomElement$: Observable<HTMLElement>;
}

interface NotificationsServiceDeps {
  i18n: I18nSetup;
  uiSettings: UiSettingsSetup;
}

/** @public */
export class NotificationsService {
  private readonly toasts: ToastsService;

  private readonly toastsContainer$: Subject<HTMLElement>;
  private domElemSubscription?: Subscription;
  private uiSettingsErrorSubscription?: Subscription;
  private targetDomElement?: HTMLElement;

  constructor(private readonly params: NotificationServiceParams) {
    this.toastsContainer$ = new Subject<HTMLElement>();
    this.toasts = new ToastsService({
      targetDomElement$: this.toastsContainer$.asObservable(),
    });
  }

  public setup({ i18n: i18nDep, uiSettings }: NotificationsServiceDeps) {
    this.domElemSubscription = this.params.targetDomElement$.subscribe({
      next: targetDomElement => {
        this.cleanupTargetDomElement();
        this.targetDomElement = targetDomElement;

        const toastsContainer = document.createElement('div');
        targetDomElement.appendChild(toastsContainer);
        this.toastsContainer$.next(toastsContainer);
      },
    });

    const notificationSetup = { toasts: this.toasts.setup({ i18n: i18nDep }) };

    this.uiSettingsErrorSubscription = uiSettings.getUpdateErrors$().subscribe(error => {
      notificationSetup.toasts.addDanger({
        title: i18n.translate('core.uiSettings.unableUpdateUISettingNotificationMessageTitle', {
          defaultMessage: 'Unable to update UI setting',
        }),
        text: error.message,
      });
    });

    return notificationSetup;
  }

  public stop() {
    this.toasts.stop();
    this.cleanupTargetDomElement();

    if (this.domElemSubscription) {
      this.domElemSubscription.unsubscribe();
    }

    if (this.uiSettingsErrorSubscription) {
      this.uiSettingsErrorSubscription.unsubscribe();
    }
  }

  private cleanupTargetDomElement() {
    if (this.targetDomElement) {
      this.targetDomElement.textContent = '';
    }
  }
}

/** @public */
export type NotificationsSetup = ReturnType<NotificationsService['setup']>;
