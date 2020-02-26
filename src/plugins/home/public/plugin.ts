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

import { CoreStart, Plugin } from 'src/core/public';
import {
  EnvironmentService,
  EnvironmentServiceSetup,
  EnvironmentServiceStart,
  FeatureCatalogueRegistry,
  FeatureCatalogueRegistrySetup,
  FeatureCatalogueRegistryStart,
  TutorialService,
  TutorialServiceSetup,
  TutorialServiceStart,
} from './services';

export class HomePublicPlugin implements Plugin<HomePublicPluginSetup, HomePublicPluginStart> {
  private readonly featuresCatalogueRegistry = new FeatureCatalogueRegistry();
  private readonly environmentService = new EnvironmentService();
  private readonly tutorialService = new TutorialService();

  public async setup() {
    return {
      featureCatalogue: { ...this.featuresCatalogueRegistry.setup() },
      environment: { ...this.environmentService.setup() },
      tutorials: { ...this.tutorialService.setup() },
    };
  }

  public async start(core: CoreStart) {
    return {
      featureCatalogue: {
        ...this.featuresCatalogueRegistry.start({
          capabilities: core.application.capabilities,
        }),
      },
      tutorials: { ...this.tutorialService.start() },
      environment: { ...this.environmentService.start() },
    };
  }
}

/** @public */
export type FeatureCatalogueSetup = FeatureCatalogueRegistrySetup;

/** @public */
export type FeatureCatalogueStart = FeatureCatalogueRegistryStart;

/** @public */
export type EnvironmentSetup = EnvironmentServiceSetup;

/** @public */
export type EnvironmentStart = EnvironmentServiceStart;

/** @public */
export type TutorialSetup = TutorialServiceSetup;

/** @public */
export type TutorialStart = TutorialServiceStart;

/** @public */
export interface HomePublicPluginSetup {
  tutorials: TutorialServiceSetup;
  featureCatalogue: FeatureCatalogueSetup;
  /**
   * The environment service is only available for a transition period and will
   * be replaced by display specific extension points.
   * @deprecated
   */
  environment: EnvironmentSetup;
}

/** @public */
export interface HomePublicPluginStart {
  tutorials: TutorialServiceStart;
  featureCatalogue: FeatureCatalogueStart;
  environment: EnvironmentStart;
}
