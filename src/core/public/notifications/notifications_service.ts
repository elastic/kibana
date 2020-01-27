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
import { PulseServiceSetup, PulseService } from '../pulse';
import { errorChannelPayloads } from '../pulse/mock_data/errors';
import { PulseErrorInstructionValue } from '../pulse/channel';

interface SetupDeps {
  uiSettings: IUiSettingsClient;
  pulse: PulseServiceSetup;
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

  private pulse: PulseService;
  private instructionsSubscription?: Subscription;

  constructor() {
    this.toasts = new ToastsService();
    this.pulse = new PulseService();
  }

  public setup({ uiSettings, pulse }: SetupDeps): NotificationsSetup {
    const notificationSetup = {
      toasts: this.toasts.setup({ uiSettings }),
      pulse: this.pulse.setup(),
    };
    this.uiSettingsErrorSubscription = uiSettings.getUpdateErrors$().subscribe((error: Error) => {
      notificationSetup.toasts.addDanger({
        title: i18n.translate('core.notifications.unableUpdateUISettingNotificationMessageTitle', {
          defaultMessage: 'Unable to update UI setting',
        }),
        text: error.message,
      });
    });

    errorChannelPayloads.forEach((element: PulseErrorInstructionValue) => {
      pulse.getChannel('errors').sendPulse(element);
    });
    this.instructionsSubscription = pulse
      .getChannel('errors')
      .instructions$()
      .subscribe(instructions => {
        if (instructions && instructions.length) {
          instructions.forEach(instruction => {
            notificationSetup.toasts.addError(new Error(JSON.stringify(instruction)), {
              // @ts-ignore-next-line
              title: `Error:${instruction.hash}`,
              toastMessage: 'The error has been reported to Pulse',
            });
          });
        }
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
    this.pulse.stop();

    if (this.targetDomElement) {
      this.targetDomElement.textContent = '';
    }

    if (this.uiSettingsErrorSubscription) {
      this.uiSettingsErrorSubscription.unsubscribe();
    }

    if (this.instructionsSubscription) {
      this.instructionsSubscription.unsubscribe();
    }
  }
}

/** @public */
export interface NotificationsSetup {
  /** {@link ToastsSetup} */
  toasts: ToastsSetup;
  pulse: Promise<PulseServiceSetup>;
}

/** @public */
export interface NotificationsStart {
  /** {@link ToastsStart} */
  toasts: ToastsStart;
}
