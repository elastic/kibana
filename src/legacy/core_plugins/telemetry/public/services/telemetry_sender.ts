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

import { npStart } from 'ui/new_platform';
import { Storage } from 'ui/storage';
import { TelemetryOptInService } from './telemetry_opt_in';
import { REPORT_INTERVAL_MS, LOCALSTORAGE_KEY } from '../../common/constants';

export class TelemetrySender {
  private isSending = false;
  private telemetryOptInService: TelemetryOptInService;
  private telemetryUrl: string;
  private storage: Storage;
  private lastReport?: number;

  constructor(telemetryOptInService: TelemetryOptInService) {
    this.telemetryOptInService = telemetryOptInService;
    this.telemetryUrl = npStart.core.injectedMetadata.getInjectedVar('telemetryUrl') as string;
    this.storage = new Storage(window.localStorage);
    // try to load the local storage data
    const attributes = this.storage.get(LOCALSTORAGE_KEY) || {};
    this.lastReport = attributes.lastReport;
  }

  _saveToBrowser() {
    // we are the only code that manipulates this key, so it's safe to blindly overwrite the whole object
    this.storage.set(LOCALSTORAGE_KEY, { lastReport: this.lastReport });
  }

  /**
   * Determine if we are due to send a new report.
   */
  _checkReportStatus() {
    const telemetryOptedIn = this.telemetryOptInService.getOptIn();
    // check if opt-in for telemetry is enabled
    if (telemetryOptedIn) {
      // returns NaN for any malformed or unset (null/undefined) value
      const lastReport = parseInt(`${this.lastReport}`, 10);
      // If it's been a day since we last sent telemetry
      if (isNaN(lastReport) || Date.now() - lastReport > REPORT_INTERVAL_MS) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check report permission and if passes, send the report
   */
  private sendIfDue = async () => {
    if (this.isSending || !this._checkReportStatus()) {
      return;
    }

    // mark that we are working so future requests are ignored until we're done
    this.isSending = true;
    try {
      const data = await this.telemetryOptInService.fetchTelemetry({ unencrypted: false });
      const clusters = Array.isArray(data) ? data : [data];
      await Promise.all(
        clusters.map(cluster => {
          return window.fetch(this.telemetryUrl, {
            body: JSON.stringify(cluster),
            mode: 'cors',
            method: 'post',
          });
        })
      );
      // we sent a report, so we need to record and store the current timestamp
      this.lastReport = Date.now();
      this._saveToBrowser();
    } catch (err) {
      // swallow error, we dont need users to worry about this
    }
    this.isSending = false;
  };

  public start() {
    // continuously check if it's due time for a report
    return window.setInterval(() => this.sendIfDue(), 60000);
  }
}
