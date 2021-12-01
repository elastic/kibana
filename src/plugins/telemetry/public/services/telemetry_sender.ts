/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  REPORT_INTERVAL_MS,
  LOCALSTORAGE_KEY,
  PAYLOAD_CONTENT_ENCODING,
} from '../../common/constants';
import { TelemetryService } from './telemetry_service';
import { Storage } from '../../../kibana_utils/public';
import type { EncryptedTelemetryPayload } from '../../common/types';

export class TelemetrySender {
  private readonly telemetryService: TelemetryService;
  private lastReported?: string;
  private readonly storage: Storage;
  private intervalId: number = 0; // setInterval returns a positive integer, 0 means no interval is set
  private retryCount: number = 0;

  static getRetryDelay(retryCount: number) {
    return 60 * (1000 * Math.min(Math.pow(2, retryCount), 64)); // 120s, 240s, 480s, 960s, 1920s, 3840s, 3840s, 3840s
  }

  constructor(telemetryService: TelemetryService) {
    this.telemetryService = telemetryService;
    this.storage = new Storage(window.localStorage);

    const attributes = this.storage.get(LOCALSTORAGE_KEY);
    if (attributes) {
      this.lastReported = attributes.lastReport;
    }
  }

  private saveToBrowser = () => {
    // we are the only code that manipulates this key, so it's safe to blindly overwrite the whole object
    this.storage.set(LOCALSTORAGE_KEY, { lastReport: this.lastReported });
  };

  private shouldSendReport = (): boolean => {
    if (this.telemetryService.canSendTelemetry()) {
      if (!this.lastReported) {
        return true;
      }
      // returns NaN for any malformed or unset (null/undefined) value
      const lastReported = parseInt(this.lastReported, 10);
      // If it's been a day since we last sent telemetry
      if (isNaN(lastReported) || Date.now() - lastReported > REPORT_INTERVAL_MS) {
        return true;
      }
    }

    return false;
  };

  private sendIfDue = async (): Promise<void> => {
    if (!this.shouldSendReport()) {
      return;
    }
    // optimistically update the report date and reset the retry counter for a new time report interval window
    this.lastReported = `${Date.now()}`;
    this.saveToBrowser();
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
    if (this.intervalId === 0) {
      this.intervalId = window.setInterval(this.sendIfDue, 60000);
    }
  };
}
