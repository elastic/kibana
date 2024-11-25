/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, HttpStart, OverlayStart } from '@kbn/core/public';
import type { TelemetryService } from '../telemetry_service';
import type { TelemetryConstants } from '../..';
import { renderOptInStatusNoticeBanner } from './render_opt_in_status_notice_banner';

interface TelemetryNotificationsConstructor
  extends Pick<CoreStart, 'analytics' | 'i18n' | 'theme'> {
  http: HttpStart;
  overlays: OverlayStart;
  telemetryService: TelemetryService;
  telemetryConstants: TelemetryConstants;
}

/**
 * Helpers to the Telemetry banners spread through the code base in Welcome and Home landing pages.
 */
export class TelemetryNotifications {
  private readonly http: HttpStart;
  private readonly overlays: OverlayStart;
  private readonly startServices: Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;
  private readonly telemetryConstants: TelemetryConstants;
  private readonly telemetryService: TelemetryService;
  private optInStatusNoticeBannerId?: string;

  constructor({
    http,
    overlays,
    telemetryService,
    telemetryConstants,
    ...startServices
  }: TelemetryNotificationsConstructor) {
    this.telemetryService = telemetryService;
    this.http = http;
    this.overlays = overlays;
    this.startServices = startServices;
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
      telemetryConstants: this.telemetryConstants,
      telemetryService: this.telemetryService,
      ...this.startServices,
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
