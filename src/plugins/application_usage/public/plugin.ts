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
import { Plugin, CoreStart, CoreSetup } from 'kibana/public';
import moment, { Moment } from 'moment';
import { filter, distinctUntilChanged, map } from 'rxjs/operators';
import { Subject, merge } from 'rxjs';
import { Storage } from '../../kibana_utils/public';
import {
  LOCALSTORAGE_KEY,
  LOCALSTORAGE_KEY_LAST_REPORTED,
  DO_NOT_REPORT,
  REPORT_INTERVAL,
} from './constants';

export type ApplicationUsagePluginSetup = void;
export interface ApplicationUsagePluginStart {
  __LEGACY: {
    /**
     * Legacy handler so we can report the actual app being used inside "kibana#/{appId}".
     * To be removed when we get rid of the legacy world
     *
     * @deprecated
     */
    appChanged: (appId: string) => void;
  };
}

interface CurrentUsage {
  appId: string;
  startTime: Moment;
  numberOfClicks: number;
}

interface AggregatedUsage {
  [appId: string]: {
    minutesOnScreen: number;
    numberOfClicks: number;
  };
}

export class ApplicationUsagePlugin
  implements Plugin<ApplicationUsagePluginSetup, ApplicationUsagePluginStart> {
  private readonly legacyAppId$ = new Subject<string | undefined>();
  private readonly localStorage = new Storage(window.localStorage);
  private currentUsage?: CurrentUsage;
  private lastAppId?: string;
  private readonly infraSubApps = new Set<string>();

  public setup({}: CoreSetup): ApplicationUsagePluginSetup {}

  public start({ http, application }: CoreStart): ApplicationUsagePluginStart {
    merge(application.currentAppId$, this.legacyAppId$)
      .pipe(
        filter(appId => typeof appId === 'string' && !DO_NOT_REPORT.includes(appId)),
        map(appId => {
          if (appId === 'infra') {
            // Hack for infra because of legacy multiple ways of registering apps
            const [, hash] = (window.location.hash || '').match(/#\/(\w+)\//) || [];
            this.infraSubApps.add(hash);
            return hash;
          }
          return appId;
        }),
        distinctUntilChanged()
      )
      .subscribe(appId => appId && this.appChanged(appId));

    // Before leaving the page, make sure we store the current usage
    window.addEventListener('beforeunload', () => this.onUnload());

    // Hack for legacy apps that only change the hash ('infra' explicitly)
    window.addEventListener('hashchange', () => {
      if (this.infraSubApps.has(this.lastAppId || '')) {
        this.legacyAppId$.next('infra');
      }
    });

    // Monitoring dashboards might be open in background and we are fine with that
    // but we don't want to report hours if the user goes to another tab and Kibana is not shown
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.lastAppId) {
        this.appChanged(this.lastAppId);
      } else if (document.visibilityState === 'hidden') {
        this.onUnload();
        this.reportUsage(http);
      }
    });

    // Count any clicks and assign it to the current app
    window.addEventListener('click', () => this.currentUsage && this.currentUsage.numberOfClicks++);

    // Send the data to the server every REPORT_INTERVAL
    setInterval(() => this.reportUsage(http), REPORT_INTERVAL);
    // If we haven't reported to the server in a long time, trigger it now
    const { lastReported } = this.localStorage.get(LOCALSTORAGE_KEY_LAST_REPORTED) || {
      lastReported: 0,
    };
    if (moment().diff(lastReported, 'milliseconds') > REPORT_INTERVAL) {
      this.reportUsage(http);
    }

    return {
      __LEGACY: {
        appChanged: appId => this.legacyAppId$.next(appId),
      },
    };
  }

  private async reportUsage(http: CoreStart['http']) {
    // Ensure we store, at least, the last usage of the current app.
    if (this.currentUsage) this.appChanged(this.currentUsage.appId);

    const existingData = this.localStorage.get(LOCALSTORAGE_KEY) as AggregatedUsage | null;
    if (!existingData) {
      return;
    }
    this.localStorage.remove(LOCALSTORAGE_KEY);
    const usage = Object.entries(existingData).map(([appId, value]) => ({ appId, ...value }));
    try {
      await http.post('/api/application-usage', { body: JSON.stringify({ usage }) });
      this.localStorage.set(LOCALSTORAGE_KEY_LAST_REPORTED, { lastReported: moment() });
    } catch (err) {
      // We failed to post the data, let's save it back to the local storage and we'll try later
      usage.forEach(({ appId, numberOfClicks, minutesOnScreen }) =>
        this.mergeAggregatedUsage(appId, numberOfClicks, minutesOnScreen)
      );
    }
  }

  private onUnload() {
    if (this.currentUsage) this.aggregateUsage(this.currentUsage);
    this.currentUsage = void 0;
  }

  private appChanged(appId: string) {
    if (this.currentUsage) this.aggregateUsage(this.currentUsage);

    this.lastAppId = appId;
    this.currentUsage = { appId, startTime: moment(), numberOfClicks: 0 };
  }

  private aggregateUsage({ appId, startTime, numberOfClicks }: CurrentUsage) {
    this.mergeAggregatedUsage(appId, numberOfClicks, moment().diff(startTime, 'minutes', true));
  }

  private mergeAggregatedUsage(appId: string, numberOfClicks: number, minutesOnScreen: number) {
    const existingData = (this.localStorage.get(LOCALSTORAGE_KEY) || {}) as AggregatedUsage;

    const appExistingData = existingData[appId] || {
      minutesOnScreen: 0,
      numberOfClicks: 0,
    };

    this.localStorage.set(LOCALSTORAGE_KEY, {
      ...existingData,
      [appId]: {
        minutesOnScreen: appExistingData.minutesOnScreen + minutesOnScreen,
        numberOfClicks: appExistingData.numberOfClicks + numberOfClicks,
      },
    });
  }
}
