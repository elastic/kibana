/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreStart } from 'kibana/public';
import { renderOptedInNoticeBanner } from './render_opted_in_notice_banner';
import { renderOptInBanner } from './render_opt_in_banner';
import { TelemetryService } from '../telemetry_service';

interface TelemetryNotificationsConstructor {
  http: CoreStart['http'];
  overlays: CoreStart['overlays'];
  telemetryService: TelemetryService;
}

export class TelemetryNotifications {
  private readonly http: CoreStart['http'];
  private readonly overlays: CoreStart['overlays'];
  private readonly telemetryService: TelemetryService;
  private optedInNoticeBannerId?: string;
  private optInBannerId?: string;

  constructor({ http, overlays, telemetryService }: TelemetryNotificationsConstructor) {
    this.telemetryService = telemetryService;
    this.http = http;
    this.overlays = overlays;
  }

  public shouldShowOptedInNoticeBanner = (): boolean => {
    const userShouldSeeOptInNotice = this.telemetryService.getUserShouldSeeOptInNotice();
    const bannerOnScreen = typeof this.optedInNoticeBannerId !== 'undefined';
    return !bannerOnScreen && userShouldSeeOptInNotice;
  };

  public renderOptedInNoticeBanner = (): void => {
    const bannerId = renderOptedInNoticeBanner({
      http: this.http,
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
