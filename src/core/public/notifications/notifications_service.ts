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

import { Subscription } from 'rxjs';
import { I18nStart } from '../i18n';
import { ToastsService, ToastsSetup, ToastsStart } from './toasts';
import { IUiSettingsClient } from '../ui_settings';
import { OverlayStart } from '../overlays';

interface SetupDeps {
  uiSettings: IUiSettingsClient;
}

interface StartDeps {
  i18n: I18nStart;
  overlays: OverlayStart;
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

  public setup({ uiSettings }: SetupDeps): NotificationsSetup {
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

  public start({ i18n: i18nDep, overlays, targetDomElement }: StartDeps): NotificationsStart {
    this.targetDomElement = targetDomElement;
    const toastsContainer = document.createElement('div');
    targetDomElement.appendChild(toastsContainer);

    return {
      toasts: this.toasts.start({ i18n: i18nDep, overlays, targetDomElement: toastsContainer }),
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

/** @public */
export interface NotificationsSetup {
  /** {@link ToastsSetup} */
  toasts: ToastsSetup;
}

/** @public */
export interface NotificationsStart {
  /** {@link ToastsStart} */
  toasts: ToastsStart;
}
