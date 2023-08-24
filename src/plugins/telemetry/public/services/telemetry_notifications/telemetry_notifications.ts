/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import type { TelemetryService } from '../telemetry_service';
import type { TelemetryConstants } from '../..';
import { renderOptInStatusNoticeBanner } from './render_opt_in_status_notice_banner';

interface TelemetryNotificationsConstructor {
  http: HttpStart;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  telemetryService: TelemetryService;
  telemetryConstants: TelemetryConstants;
}

/**
 * Helpers to the Telemetry banners spread through the code base in Welcome and Home landing pages.
 */
export class TelemetryNotifications {
  private readonly http: HttpStart;
  private readonly overlays: OverlayStart;
  private readonly theme: ThemeServiceStart;
  private readonly telemetryConstants: TelemetryConstants;
  private readonly telemetryService: TelemetryService;
  private optInStatusNoticeBannerId?: string;

  constructor({
    http,
    overlays,
    theme,
    telemetryService,
    telemetryConstants,
  }: TelemetryNotificationsConstructor) {
    this.telemetryService = telemetryService;
    this.http = http;
    this.overlays = overlays;
    this.theme = theme;
    this.telemetryConstants = telemetryConstants;
  }

  /**
   * Should the opted-in banner be shown to the user?
   */
  public shouldShowOptInStatusNoticeBanner = (): boolean => {
    const userShouldSeeOptInNotice = this.telemetryService.getUserShouldSeeOptInNotice();
    const bannerOnScreen = typeof this.optInStatusNoticeBannerId !== 'undefined';
    return !bannerOnScreen && userShouldSeeOptInNotice;
  };

  /**
   * Renders the banner that claims the cluster is opted-in, and gives the option to opt-out.
   */
  public renderOptInStatusNoticeBanner = (): void => {
    const bannerId = renderOptInStatusNoticeBanner({
      http: this.http,
      onSeen: this.setOptInStatusNoticeSeen,
      overlays: this.overlays,
      theme: this.theme,
      telemetryConstants: this.telemetryConstants,
      telemetryService: this.telemetryService,
    });

    this.optInStatusNoticeBannerId = bannerId;
  };

  /**
   * Clears the banner and stores the user's dismissal of the banner.
   */
  public setOptInStatusNoticeSeen = async (): Promise<void> => {
    if (this.optInStatusNoticeBannerId) {
      this.overlays.banners.remove(this.optInStatusNoticeBannerId);
      this.optInStatusNoticeBannerId = undefined;
    }

    await this.telemetryService.setUserHasSeenNotice();
  };
}
