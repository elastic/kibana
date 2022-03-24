/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Subscription } from 'rxjs';
import { fromEvent, interval, merge } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';
import { LOCALSTORAGE_KEY, PAYLOAD_CONTENT_ENCODING } from '../../common/constants';
import { TelemetryService } from './telemetry_service';
import { Storage } from '../../../kibana_utils/public';
import type { EncryptedTelemetryPayload } from '../../common/types';
import { isReportIntervalExpired } from '../../common/is_report_interval_expired';

export class TelemetrySender {
  private lastReported?: number;
  private readonly storage: Storage;
  private sendIfDue$?: Subscription;
  private retryCount: number = 0;

  static getRetryDelay(retryCount: number) {
    return 60 * (1000 * Math.min(Math.pow(2, retryCount), 64)); // 120s, 240s, 480s, 960s, 1920s, 3840s, 3840s, 3840s
  }

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly refreshConfig: () => Promise<void>
  ) {
    this.storage = new Storage(window.localStorage);

    const attributes = this.storage.get(LOCALSTORAGE_KEY);
    if (attributes) {
      this.lastReported = parseInt(attributes.lastReport, 10);
    }
  }

  private updateLastReported = (lastReported: number) => {
    this.lastReported = lastReported;
    // we are the only code that manipulates this key, so it's safe to blindly overwrite the whole object
    this.storage.set(LOCALSTORAGE_KEY, { lastReport: `${this.lastReported}` });
  };

  /**
   * Using the local and SO's `lastReported` values, it decides whether the last report should be considered as expired
   * @returns `true` if a new report should be generated. `false` otherwise.
   */
  private isReportDue = async (): Promise<boolean> => {
    // Try to decide with the local `lastReported` to avoid querying the server
    if (!isReportIntervalExpired(this.lastReported)) {
      // If it is not expired locally, there's no need to send it again yet.
      return false;
    }

    // Double-check with the server's value
    const globalLastReported = await this.telemetryService.fetchLastReported();

    if (globalLastReported) {
      // Update the local value to avoid repetitions of this request (it was already expired, so it doesn't really matter if the server's value is older)
      this.updateLastReported(globalLastReported);
    }

    return isReportIntervalExpired(globalLastReported);
  };

  /**
   * Returns `true` when the page is visible and active in the browser.
   */
  private isActiveWindow = () => {
    // Using `document.hasFocus()` instead of `document.visibilityState` because the latter may return "visible"
    // if 2 windows are open side-by-side because they are "technically" visible.
    return document.hasFocus();
  };

  /**
   * Using configuration, page visibility state and the lastReported dates,
   * it decides whether a new telemetry report should be sent.
   * @returns `true` if a new report should be sent. `false` otherwise.
   */
  private shouldSendReport = async (): Promise<boolean> => {
    if (this.isActiveWindow() && this.telemetryService.canSendTelemetry()) {
      if (await this.isReportDue()) {
        /*
         * If we think it should send telemetry (local optIn config is `true` and the last report is expired),
         * let's refresh the config and make sure optIn is still true.
         *
         * This change is to ensure that if the user opts-out of telemetry, background tabs realize about it without needing to refresh the page or navigate to another app.
         *
         * We are checking twice to avoid making too many requests to fetch the SO:
         * `sendIfDue` is triggered every minute or when the page regains focus.
         * If the previously fetched config already dismisses the telemetry, there's no need to fetch the telemetry config.
         *
         * The edge case is: if previously opted-out and the user opts-in, background tabs won't realize about that until they navigate to another app.
         * We are fine with that compromise for now.
         */
        await this.refreshConfig();
        return this.telemetryService.canSendTelemetry();
      }
    }

    return false;
  };

  private sendIfDue = async (): Promise<void> => {
    if (!(await this.shouldSendReport())) {
      return;
    }
    // optimistically update the report date and reset the retry counter for a new time report interval window
    this.updateLastReported(Date.now());
    this.retryCount = 0;
    await this.sendUsageData();
  };

  private sendUsageData = async (): Promise<void> => {
    try {
      const telemetryUrl = this.telemetryService.getTelemetryUrl();
      const telemetryPayload: EncryptedTelemetryPayload =
        await this.telemetryService.fetchTelemetry();

      await Promise.all(
        telemetryPayload.map(
          async ({ clusterUuid, stats }) =>
            await fetch(telemetryUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Elastic-Stack-Version': this.telemetryService.currentKibanaVersion,
                'X-Elastic-Cluster-ID': clusterUuid,
                'X-Elastic-Content-Encoding': PAYLOAD_CONTENT_ENCODING,
              },
              body: stats,
            })
        )
      );

      await this.telemetryService.updateLastReported().catch(() => {}); // Let's catch the error. Worst-case scenario another Telemetry report will be generated somewhere else.
    } catch (err) {
      // ignore err and try again but after a longer wait period.
      this.retryCount = this.retryCount + 1;
      if (this.retryCount < 20) {
        // exponentially backoff the time between subsequent retries to up to 19 attempts, after which we give up until the next report is due
        window.setTimeout(this.sendUsageData, TelemetrySender.getRetryDelay(this.retryCount));
      } else {
        /* eslint no-console: ["error", { allow: ["warn"] }] */
        console.warn(
          `TelemetrySender.sendUsageData exceeds number of retry attempts with ${err.message}`
        );
      }
    }
  };

  public startChecking = () => {
    if (!this.sendIfDue$) {
      // Trigger sendIfDue...
      this.sendIfDue$ = merge(
        // ... periodically
        interval(60000),
        // ... when it regains `focus`
        fromEvent(window, 'focus') // Using `window` instead of `document` because Chrome only emits on the first one.
      )
        .pipe(exhaustMap(this.sendIfDue))
        .subscribe();
    }
  };

  public stop = () => {
    this.sendIfDue$?.unsubscribe();
  };
}
