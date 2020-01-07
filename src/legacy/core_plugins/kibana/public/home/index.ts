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

import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { npSetup, npStart } from 'ui/new_platform';
import chrome from 'ui/chrome';
import { IPrivate } from 'ui/private';
import { HomePlugin, LegacyAngularInjectedDependencies } from './plugin';
import { TelemetryOptInProvider } from '../../../telemetry/public/services';

/**
 * Get dependencies relying on the global angular context.
 * They also have to get resolved together with the legacy imports above
 */
async function getAngularDependencies(): Promise<LegacyAngularInjectedDependencies> {
  const injector = await chrome.dangerouslyGetActiveInjector();

  const Private = injector.get<IPrivate>('Private');

  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');
  const telemetryBanner = npStart.core.injectedMetadata.getInjectedVar('telemetryBanner');
  const telemetryOptInProvider = Private(TelemetryOptInProvider);

  return {
    telemetryOptInProvider,
    shouldShowTelemetryOptIn:
      telemetryEnabled && telemetryBanner && !telemetryOptInProvider.getOptIn(),
  };
}

let copiedLegacyCatalogue = false;

(async () => {
  const instance = new HomePlugin();
  instance.setup(npSetup.core, {
    ...npSetup.plugins,
    __LEGACY: {
      metadata: npStart.core.injectedMetadata.getLegacyMetadata(),
      getFeatureCatalogueEntries: async () => {
        if (!copiedLegacyCatalogue) {
          const injector = await chrome.dangerouslyGetActiveInjector();
          const Private = injector.get<IPrivate>('Private');
          // Merge legacy registry with new registry
          (Private(FeatureCatalogueRegistryProvider as any) as any).inTitleOrder.map(
            npSetup.plugins.home.featureCatalogue.register
          );
          copiedLegacyCatalogue = true;
        }
        return npStart.plugins.home.featureCatalogue.get();
      },
      getAngularDependencies,
    },
  });
  instance.start(npStart.core, {
    data: npStart.plugins.data,
  });
})();
