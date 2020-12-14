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

import { Reporter, METRIC_TYPE, ApplicationUsageTracker } from '@kbn/analytics';
import { Subject, merge } from 'rxjs';
import { Storage } from '../../kibana_utils/public';
import { createReporter, trackApplicationUsageChange } from './services';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  HttpSetup,
} from '../../../core/public';

export interface PublicConfigType {
  uiCounters: {
    enabled: boolean;
    debug: boolean;
  };
}

export interface UsageCollectionSetup {
  allowTrackUserAgent: (allow: boolean) => void;
  applicationUsageTracker: ApplicationUsageTracker;
  reportUiCounter: Reporter['reportUiCounter'];
  METRIC_TYPE: typeof METRIC_TYPE;
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

export interface UsageCollectionStart {
  reportUiCounter: Reporter['reportUiCounter'];
  METRIC_TYPE: typeof METRIC_TYPE;
  applicationUsageTracker: ApplicationUsageTracker;
}

export function isUnauthenticated(http: HttpSetup) {
  const { anonymousPaths } = http;
  return anonymousPaths.isAnonymous(window.location.pathname);
}

export class UsageCollectionPlugin implements Plugin<UsageCollectionSetup, UsageCollectionStart> {
  private readonly legacyAppId$ = new Subject<string>();
  private applicationUsageTracker?: ApplicationUsageTracker;
  private trackUserAgent: boolean = true;
  private reporter?: Reporter;
  private config: PublicConfigType;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<PublicConfigType>();
  }

  public setup({ http }: CoreSetup): UsageCollectionSetup {
    const localStorage = new Storage(window.localStorage);
    const debug = this.config.uiCounters.debug;

    this.reporter = createReporter({
      localStorage,
      debug,
      fetch: http,
    });

    this.applicationUsageTracker = new ApplicationUsageTracker(this.reporter);

    return {
      applicationUsageTracker: this.applicationUsageTracker,
      allowTrackUserAgent: (allow: boolean) => {
        this.trackUserAgent = allow;
      },
      reportUiCounter: this.reporter.reportUiCounter,
      METRIC_TYPE,
      __LEGACY: {
        appChanged: (appId) => this.legacyAppId$.next(appId),
      },
    };
  }

  public start({ http, application }: CoreStart) {
    if (!this.reporter || !this.applicationUsageTracker) {
      throw new Error('Usage collection reporter not set up correctly');
    }

    if (this.config.uiCounters.enabled && !isUnauthenticated(http)) {
      this.reporter.start();
      this.applicationUsageTracker.start();
      trackApplicationUsageChange(
        merge(application.currentAppId$, this.legacyAppId$),
        this.applicationUsageTracker
      );
    }

    if (this.trackUserAgent) {
      this.reporter.reportUserAgent('kibana');
    }

    return {
      applicationUsageTracker: this.applicationUsageTracker,
      reportUiCounter: this.reporter.reportUiCounter,
      METRIC_TYPE,
    };
  }

  public stop() {
    if (this.applicationUsageTracker) {
      this.applicationUsageTracker.stop();
    }
  }
}
