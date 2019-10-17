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
import { HttpServiceBase } from 'kibana/public';
import { Storage } from 'ui/storage';
import { TelemetryOptInService } from './telemetry_opt_in';
import { REPORT_INTERVAL_MS, LOCALSTORAGE_KEY } from '../../common/constants';

export class TelemetrySender {
  private sending = false;
  private telemetryOptInService: TelemetryOptInService;
  private http: HttpServiceBase;
  private telemetryUrl: string;
  private storage: Storage;
  private telemetryOptedIn: string;
  private lastReport?: number;

  constructor(telemetryOptInService: TelemetryOptInService) {
    this.telemetryOptInService = telemetryOptInService;
    this.http = npStart.core.http;
    this.telemetryUrl = npStart.core.injectedMetadata.getInjectedVar('telemetryUrl') as string;
    this.storage = new Storage(window.localStorage);
    this.telemetryOptedIn = npStart.core.injectedMetadata.getInjectedVar(
      'telemetryOptedIn'
    ) as string;
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
    // check if opt-in for telemetry is enabled
    if (this.telemetryOptedIn) {
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
    if (this.sending || !this._checkReportStatus()) {
      return Promise.resolve(false);
    }

    // mark that we are working so future requests are ignored until we're done
    this.sending = true;
    try {
      const data = await this.telemetryOptInService.fetchTelemetry({ unencrypted: false });
      const clusters = Array.isArray(data) ? data : [data];
      await Promise.all(
        clusters.map(cluster => {
          // if passing data externally, then suppress kbnXsrfToken
          // if (this.telemetryUrl.match(/^https/)) { req.kbnXsrfToken = false; }
          return this.http.post(this.telemetryUrl, {
            body: JSON.stringify(cluster),
          });
        })
      );
      // the response object is ignored because we do not check it

      // we sent a report, so we need to record and store the current timestamp
      this.lastReport = Date.now();
      this._saveToBrowser();
    } catch (err) {
      this.sending = false;
    }
  };

  public start() {
    // continuously check if it's due time for a report
    return window.setInterval(() => this.sendIfDue(), 60000);
  }
}
