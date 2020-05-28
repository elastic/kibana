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

import { Reporter, METRIC_TYPE } from '@kbn/analytics';
import { Subject, merge } from 'rxjs';
import { Storage } from '../../kibana_utils/public';
import { createReporter } from './services';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  HttpSetup,
} from '../../../core/public';
import { reportApplicationUsage } from './services/application_usage';

interface PublicConfigType {
  uiMetric: {
    enabled: boolean;
    debug: boolean;
  };
}

export interface UsageCollectionSetup {
  allowTrackUserAgent: (allow: boolean) => void;
  reportUiStats: Reporter['reportUiStats'];
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

export function isUnauthenticated(http: HttpSetup) {
  const { anonymousPaths } = http;
  return anonymousPaths.isAnonymous(window.location.pathname);
}

export class UsageCollectionPlugin implements Plugin<UsageCollectionSetup> {
  private readonly legacyAppId$ = new Subject<string>();
  private trackUserAgent: boolean = true;
  private reporter?: Reporter;
  private config: PublicConfigType;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<PublicConfigType>();
  }

  public setup({ http }: CoreSetup): UsageCollectionSetup {
    const localStorage = new Storage(window.localStorage);
    const debug = this.config.uiMetric.debug;

    this.reporter = createReporter({
      localStorage,
      debug,
      fetch: http,
    });

    return {
      allowTrackUserAgent: (allow: boolean) => {
        this.trackUserAgent = allow;
      },
      reportUiStats: this.reporter.reportUiStats,
      METRIC_TYPE,
      __LEGACY: {
        appChanged: (appId) => this.legacyAppId$.next(appId),
      },
    };
  }

  public start({ http, application }: CoreStart) {
    if (!this.reporter) {
      return;
    }

    if (this.config.uiMetric.enabled && !isUnauthenticated(http)) {
      this.reporter.start();
    }

    if (this.trackUserAgent) {
      this.reporter.reportUserAgent('kibana');
    }
    reportApplicationUsage(merge(application.currentAppId$, this.legacyAppId$), this.reporter);
  }

  public stop() {}
}
