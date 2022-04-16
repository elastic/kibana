/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart, OverlayStart } from '@kbn/core/public';
import { renderOptedInNoticeBanner } from './render_opted_in_notice_banner';
import { renderOptInBanner } from './render_opt_in_banner';
import { TelemetryService } from '../telemetry_service';
import { TelemetryConstants } from '../..';

interface TelemetryNotificationsConstructor {
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
  private readonly telemetryConstants: TelemetryConstants;
  private readonly telemetryService: TelemetryService;
  private optedInNoticeBannerId?: string;
  private optInBannerId?: string;

  constructor({
    http,
    overlays,
    telemetryService,
    telemetryConstants,
  }: TelemetryNotificationsConstructor) {
    this.telemetryService = telemetryService;
    this.http = http;
    this.overlays = overlays;
    this.telemetryConstants = telemetryConstants;
  }

  /**
   * Should the opted-in banner be shown to the user?
   */
  public shouldShowOptedInNoticeBanner = (): boolean => {
    const userShouldSeeOptInNotice = this.telemetryService.getUserShouldSeeOptInNotice();
    const bannerOnScreen = typeof this.optedInNoticeBannerId !== 'undefined';
    return !bannerOnScreen && userShouldSeeOptInNotice;
  };

  /**
   * Renders the banner that claims the cluster is opted-in, and gives the option to opt-out.
   */
  public renderOptedInNoticeBanner = (): void => {
    const bannerId = renderOptedInNoticeBanner({
      http: this.http,
      onSeen: this.setOptedInNoticeSeen,
      overlays: this.overlays,
      telemetryConstants: this.telemetryConstants,
    });

    this.optedInNoticeBannerId = bannerId;
  };

  /**
   * Should the banner to opt-in be shown to the user?
   */
  public shouldShowOptInBanner = (): boolean => {
    const isOptedIn = this.telemetryService.getIsOptedIn();
    const bannerOnScreen = typeof this.optInBannerId !== 'undefined';
    return !bannerOnScreen && isOptedIn === null;
  };

  /**
   * Renders the banner that claims the cluster is opted-out, and gives the option to opt-in.
   */
  public renderOptInBanner = (): void => {
    const bannerId = renderOptInBanner({
      setOptIn: this.onSetOptInClick,
      overlays: this.overlays,
      telemetryConstants: this.telemetryConstants,
    });

    this.optInBannerId = bannerId;
  };

  /**
   * Opt-in/out button handler
   * @param isOptIn true/false whether the user opts-in/out
   */
  private onSetOptInClick = async (isOptIn: boolean) => {
    if (this.optInBannerId) {
      this.overlays.banners.remove(this.optInBannerId);
      this.optInBannerId = undefined;
    }

    await this.telemetryService.setOptIn(isOptIn);
  };

  /**
   * Clears the banner and stores the user's dismissal of the banner.
   */
  public setOptedInNoticeSeen = async (): Promise<void> => {
    if (this.optedInNoticeBannerId) {
      this.overlays.banners.remove(this.optedInNoticeBannerId);
      this.optedInNoticeBannerId = undefined;
    }

    await this.telemetryService.setUserHasSeenNotice();
  };
}
