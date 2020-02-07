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

import { REPORT_INTERVAL_MS, LOCALSTORAGE_KEY } from '../../common/constants';

export class Telemetry {
  /**
   * @param {Object} $injector - AngularJS injector service
   * @param {Function} fetchTelemetry Method used to fetch telemetry data (expects an array response)
   */
  constructor($injector, fetchTelemetry) {
    this._storage = $injector.get('localStorage');
    this._$http = $injector.get('$http');
    this._telemetryUrl = $injector.get('telemetryUrl');
    this._telemetryOptedIn = $injector.get('telemetryOptedIn');
    this._fetchTelemetry = fetchTelemetry;
    this._sending = false;

    // try to load the local storage data
    const attributes = this._storage.get(LOCALSTORAGE_KEY) || {};
    this._lastReport = attributes.lastReport;
  }

  _saveToBrowser() {
    // we are the only code that manipulates this key, so it's safe to blindly overwrite the whole object
    this._storage.set(LOCALSTORAGE_KEY, { lastReport: this._lastReport });
  }

  /**
   * Determine if we are due to send a new report.
   *
   * @returns {Boolean} true if a new report should be sent. false otherwise.
   */
  _checkReportStatus() {
    // check if opt-in for telemetry is enabled
    if (this._telemetryOptedIn) {
      // returns NaN for any malformed or unset (null/undefined) value
      const lastReport = parseInt(this._lastReport, 10);
      // If it's been a day since we last sent telemetry
      if (isNaN(lastReport) || Date.now() - lastReport > REPORT_INTERVAL_MS) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check report permission and if passes, send the report
   *
   * @returns {Promise} Always.
   */
  _sendIfDue() {
    if (this._sending || !this._checkReportStatus()) {
      return Promise.resolve(false);
    }

    // mark that we are working so future requests are ignored until we're done
    this._sending = true;

    return (
      this._fetchTelemetry()
        .then(response => {
          const clusters = [].concat(response.data);
          return Promise.all(
            clusters.map(cluster => {
              const req = {
                method: 'POST',
                url: this._telemetryUrl,
                data: cluster,
              };
              // if passing data externally, then suppress kbnXsrfToken
              if (this._telemetryUrl.match(/^https/)) {
                req.kbnXsrfToken = false;
              }
              return this._$http(req);
            })
          );
        })
        // the response object is ignored because we do not check it
        .then(() => {
          // we sent a report, so we need to record and store the current timestamp
          this._lastReport = Date.now();
          this._saveToBrowser();
        })
        // no ajaxErrorHandlers for telemetry
        .catch(() => null)
        .then(() => {
          this._sending = false;
          return true; // sent, but not necessarilly successfully
        })
    );
  }

  /**
   * Public method
   *
   * @returns {Number} `window.setInterval` response to allow cancelling the interval.
   */
  start() {
    // continuously check if it's due time for a report
    return window.setInterval(() => this._sendIfDue(), 60000);
  }
} // end class
