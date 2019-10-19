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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { Plugin as DataPlugin } from 'src/plugins/data/public';

import { DataStart } from '../../../data/public';
import { LocalApplicationService } from '../local_application_service';

export interface LegacyAngularInjectedDependencies {
  featureCatalogueRegistryProvider: any;
  telemetryOptInProvider: any;
  shouldShowTelemetryOptIn: boolean;
}

export interface HomePluginStartDependencies {
  data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
  __LEGACY: {
    angularDependencies: LegacyAngularInjectedDependencies;
  };
}

export interface HomePluginSetupDependencies {
  __LEGACY: {
    uiStatsReporter: any;
    toastNotifications: any;
    banners: any;
    kfetch: any;
    metadata: any;
    METRIC_TYPE: any;
  };
  localApplicationService: LocalApplicationService;
}

export class HomePlugin implements Plugin {
  private dataStart: DataStart | null = null;
  private npDataStart: ReturnType<DataPlugin['start']> | null = null;
  private angularDependencies: LegacyAngularInjectedDependencies | null = null;
  private savedObjectsClient: any = null;

  setup(
    core: CoreSetup,
    {
      __LEGACY: { uiStatsReporter, toastNotifications, banners, kfetch, metadata, METRIC_TYPE },
      localApplicationService,
    }: HomePluginSetupDependencies
  ) {
    localApplicationService.register({
      id: 'home',
      title: 'Home',
      mount: async (context, params) => {
        const { renderApp } = await import('./render_app');
        return renderApp(
          context,
          {
            ...params,
            uiStatsReporter,
            toastNotifications,
            banners,
            kfetch,
            savedObjectsClient: this.savedObjectsClient,
            metadata,
            METRIC_TYPE,
            data: this.dataStart!,
            npData: this.npDataStart!,
          },
          this.angularDependencies!
        );
      },
    });
  }

  start(
    core: CoreStart,
    { data, npData, __LEGACY: { angularDependencies } }: HomePluginStartDependencies
  ) {
    // TODO is this really the right way? I though the app context would give us those
    this.dataStart = data;
    this.npDataStart = npData;
    this.angularDependencies = angularDependencies;
    this.savedObjectsClient = core.savedObjects.client;
  }

  stop() {}
}
