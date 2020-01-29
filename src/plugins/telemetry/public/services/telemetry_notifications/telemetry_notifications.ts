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

import { CoreStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { renderOptedInBanner } from './render_opted_in_notice_banner';

interface TelemetryNotificationsConstructor {
  notifications: CoreStart['notifications'];
  injectedMetadata: CoreStart['injectedMetadata'];
  overlays: CoreStart['overlays'];
  http: CoreStart['http'];
}

export class TelemetryNotifications {
  private readonly overlays: CoreStart['overlays'];
  private readonly notifications: CoreStart['notifications'];
  private readonly http: CoreStart['http'];

  private optedInBannerNoticeId?: string;
  // private optInBannerId?: string;
  private showOptedInNoticeBanner: boolean;

  constructor({
    notifications,
    http,
    overlays,
    injectedMetadata,
  }: TelemetryNotificationsConstructor) {
    this.notifications = notifications;
    this.http = http;
    this.overlays = overlays;

    this.showOptedInNoticeBanner = injectedMetadata.getInjectedVar(
      'telemetryNotifyUserAboutOptInDefault'
    ) as boolean;
  }

  public shouldShowOptedInNoticeBanner() {
    return this.showOptedInNoticeBanner;
  }

  public renderOptedInNoticeBanner = () => {
    const bannerId = renderOptedInBanner({
      onSeen: this.setOptedInNoticeSeen,
      overlays: this.overlays,
    });

    this.optedInBannerNoticeId = bannerId;
  };

  public setOptedInNoticeSeen = async (): Promise<void> => {
    // If they've seen the notice don't spam the API
    if (!this.showOptedInNoticeBanner) {
      return;
    }

    const optInBannerNoticeId = this.optedInBannerNoticeId;
    if (optInBannerNoticeId) {
      this.overlays.banners.remove(optInBannerNoticeId);
    }

    try {
      await this.http.put('/api/telemetry/v2/userHasSeenNotice');
      this.showOptedInNoticeBanner = false;
    } catch (error) {
      this.notifications.toasts.addError(error, {
        title: i18n.translate('telemetry.optInNoticeSeenErrorTitle', {
          defaultMessage: 'Error',
        }),
        toastMessage: i18n.translate('telemetry.optInNoticeSeenErrorToastText', {
          defaultMessage: 'An error occurred dismissing the notice',
        }),
      });
      this.showOptedInNoticeBanner = true;
    }
  };
}

// telemetryEnabled &&
//     !telemetryOptInService.getOptIn() &&
//     telemetryOptInService.canChangeOptInStatus()
