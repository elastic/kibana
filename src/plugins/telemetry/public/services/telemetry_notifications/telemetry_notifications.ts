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
import { renderOptedInNoticeBanner } from './render_opted_in_notice_banner';
import { renderOptInBanner } from './render_opt_in_banner';
import { TelemetryService } from '../telemetry_service';

interface TelemetryNotificationsConstructor {
  overlays: CoreStart['overlays'];
  telemetryService: TelemetryService;
}

export class TelemetryNotifications {
  private readonly overlays: CoreStart['overlays'];
  private readonly telemetryService: TelemetryService;
  private optedInNoticeBannerId?: string;
  private optInBannerId?: string;

  constructor({ overlays, telemetryService }: TelemetryNotificationsConstructor) {
    this.telemetryService = telemetryService;
    this.overlays = overlays;
  }

  public shouldShowOptedInNoticeBanner = (): boolean => {
    const userHasSeenOptedInNotice = this.telemetryService.getUserHasSeenOptedInNotice();
    const bannerOnScreen = typeof this.optedInNoticeBannerId !== 'undefined';
    return !bannerOnScreen && userHasSeenOptedInNotice;
  };

  public renderOptedInNoticeBanner = (): void => {
    const bannerId = renderOptedInNoticeBanner({
      onSeen: this.setOptedInNoticeSeen,
      overlays: this.overlays,
    });

    this.optedInNoticeBannerId = bannerId;
  };

  public shouldShowOptInBanner = (): boolean => {
    const isOptedIn = this.telemetryService.getIsOptedIn();
    const bannerOnScreen = typeof this.optInBannerId !== 'undefined';
    return !bannerOnScreen && isOptedIn === null;
  };

  public renderOptInBanner = (): void => {
    const bannerId = renderOptInBanner({
      setOptIn: this.onSetOptInClick,
      overlays: this.overlays,
    });

    this.optInBannerId = bannerId;
  };

  private onSetOptInClick = async (isOptIn: boolean) => {
    if (this.optInBannerId) {
      this.overlays.banners.remove(this.optInBannerId);
      this.optInBannerId = undefined;
    }

    await this.telemetryService.setOptIn(isOptIn);
  };

  public setOptedInNoticeSeen = async (): Promise<void> => {
    if (this.optedInNoticeBannerId) {
      this.overlays.banners.remove(this.optedInNoticeBannerId);
      this.optedInNoticeBannerId = undefined;
    }

    await this.telemetryService.setUserHasSeenNotice();
  };
}
