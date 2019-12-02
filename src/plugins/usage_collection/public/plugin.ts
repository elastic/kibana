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

import { createReporter, UiStatsMetricType, METRIC_TYPE } from '@kbn/analytics';
import { Storage } from 'ui/storage';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';

export interface MetricsSetupContract {
  registerApp: (appName: string) => void;
}

export interface MetricsStartContract {
  reportUiStats: (
    appName: string,
    type: UiStatsMetricType,
    eventNames: string | string[],
    count?: number
  ) => void;
  METRIC_TYPE: typeof METRIC_TYPE;
}

export class MetricsPublicPlugin
  implements Plugin<{}, {}, MetricsSetupContract, MetricsStartContract> {
  private debugMode: boolean = false;
  private apps: { [appName: string]: boolean } = {};

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): MetricsSetupContract {
    this.debugMode = true;
    return {
      registerApp: (appName: string) => {
        if (this.apps[appName]) {
          throw Error(`${appName} already registered in metrics plugin.`);
        }
        this.apps[appName] = true;
      },
    };
  }

  public start(core: CoreStart): MetricsStartContract {
    const localStorage = new Storage(window.localStorage) as any;
    const http = core.http;
    const debug = this.debugMode;
    // npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');

    const reporter = createReporter({
      debug,
      storage: localStorage,
      async http(report: object) {
        const url = `/api/metrics/report`;
        await http.post(url, {
          body: JSON.stringify({ report }),
        });
      },
    });

    return {
      reportUiStats: (
        appName: string,
        type: UiStatsMetricType,
        eventNames: string | string[],
        count?: number
      ) => {
        if (this.apps[appName]) {
          return reporter.reportUiStats(appName, type, eventNames, count);
        }
        if (this.debugMode) {
          throw Error(`${appName} not registered in metrics plugin.`);
        }
      },
      METRIC_TYPE,
    };
  }
  public stop() {}
}
