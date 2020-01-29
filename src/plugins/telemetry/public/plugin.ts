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
import {
  // PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  HttpSetup,
} from '../../../core/public';
import { TelemetrySender, TelemetryService } from './services';

// interface PublicConfigType {
//   uiMetric: {
//     enabled: boolean;
//     debug: boolean;
//   };
// }

export interface TelemetryStart {
  telemetryService: TelemetryService;
}

export class TelemetryPlugin implements Plugin<void, TelemetryStart> {
  // private config: PublicConfigType;
  private isUnauthenticated: boolean = false;
  // constructor(initializerContext: PluginInitializerContext) {
  //   this.config = initializerContext.config.get<PublicConfigType>();
  // }

  public setup({ http }: CoreSetup): TelemetrySetup {
    this.isUnauthenticated = this.getIsUnauthenticated(http);
    return {};
  }

  public start({ injectedMetadata, http }: CoreStart): TelemetryStart {
    const isPluginEnabled = injectedMetadata.getInjectedVar('telemetryEnabled') as boolean;
    const sendUsageFrom = injectedMetadata.getInjectedVar('telemetrySendUsageFrom') as
      | 'browser'
      | 'server';
    const telemetryService = new TelemetryService({ http, injectedMetadata });

    this.maybeStartTelemetryPoller({
      telemetryService,
      isPluginEnabled,
      sendUsageFrom,
    });

    return {
      telemetryService,
    };
  }

  private getIsUnauthenticated(http: HttpSetup) {
    const { anonymousPaths } = http;
    return anonymousPaths.isAnonymous(window.location.pathname);
  }

  private maybeStartTelemetryPoller({
    telemetryService,
    isPluginEnabled,
    sendUsageFrom,
  }: {
    telemetryService: TelemetryService;
    isPluginEnabled: boolean;
    sendUsageFrom: string;
  }) {
    if (isPluginEnabled && sendUsageFrom === 'browser') {
      const sender = new TelemetrySender(telemetryService);
      // no telemetry for non-logged in users
      if (!this.isUnauthenticated) {
        sender.startChecking();
      }
    }
  }
}
