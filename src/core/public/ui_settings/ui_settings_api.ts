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

import { BehaviorSubject } from 'rxjs';

import { HttpSetup } from '../http';
import { UiSettingsState } from './types';

export interface UiSettingsApiResponse {
  settings: UiSettingsState;
}

interface Changes {
  values: {
    [key: string]: any;
  };

  callback(error?: Error, response?: UiSettingsApiResponse): void;
}

const NOOP_CHANGES = {
  values: {},
  callback: () => {
    // noop
  },
};

export class UiSettingsApi {
  private pendingChanges?: Changes;
  private sendInProgress = false;

  private readonly loadingCount$ = new BehaviorSubject(0);

  constructor(private readonly http: HttpSetup) {}

  /**
   * Adds a key+value that will be sent to the server ASAP. If a request is
   * already in progress it will wait until the previous request is complete
   * before sending the next request
   */
  public batchSet(key: string, value: any) {
    return new Promise<UiSettingsApiResponse>((resolve, reject) => {
      const prev = this.pendingChanges || NOOP_CHANGES;

      this.pendingChanges = {
        values: {
          ...prev.values,
          [key]: value,
        },

        callback(error, resp) {
          prev.callback(error, resp);

          if (error) {
            reject(error);
          } else {
            resolve(resp);
          }
        },
      };

      this.flushPendingChanges();
    });
  }

  /**
   * Gets an observable that notifies subscribers of the current number of active requests
   */
  public getLoadingCount$() {
    return this.loadingCount$.asObservable();
  }

  /**
   * Prepares the uiSettings API to be discarded
   */
  public stop() {
    this.loadingCount$.complete();
  }

  /**
   * Report back if there are pending changes waiting to be sent.
   */
  public hasPendingChanges() {
    return !!(this.pendingChanges && this.sendInProgress);
  }

  /**
   * If there are changes that need to be sent to the server and there is not already a
   * request in progress, this method will start a request sending those changes. Once
   * the request is complete `flushPendingChanges()` will be called again, and if the
   * prerequisites are still true (because changes were queued while the request was in
   * progress) then another request will be started until all pending changes have been
   * sent to the server.
   */
  private async flushPendingChanges() {
    if (!this.pendingChanges) {
      return;
    }

    if (this.sendInProgress) {
      return;
    }

    const changes = this.pendingChanges;
    this.pendingChanges = undefined;

    try {
      this.sendInProgress = true;

      changes.callback(
        undefined,
        await this.sendRequest('POST', '/api/kibana/settings', {
          changes: changes.values,
        })
      );
    } catch (error) {
      changes.callback(error);
    } finally {
      this.sendInProgress = false;
      this.flushPendingChanges();
    }
  }

  /**
   * Calls window.fetch() with the proper headers and error handling logic.
   */
  private async sendRequest(method: string, path: string, body: any): Promise<any> {
    try {
      this.loadingCount$.next(this.loadingCount$.getValue() + 1);

      return await this.http.fetch(path, {
        method,
        body: JSON.stringify(body),
        headers: {
          accept: 'application/json',
        },
      });
    } catch (err) {
      if (err.response && err.response.status >= 300) {
        throw new Error(`Request failed with status code: ${err.response.status}`);
      }

      throw err;
    } finally {
      this.loadingCount$.next(this.loadingCount$.getValue() - 1);
    }
  }
}
