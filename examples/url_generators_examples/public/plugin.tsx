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

import { SharePluginStart, SharePluginSetup } from '../../../src/plugins/share/public';
import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import {
  HelloLinkGeneratorState,
  createHelloPageLinkGenerator,
  LegacyHelloLinkGeneratorState,
  HELLO_URL_GENERATOR_V1,
  HELLO_URL_GENERATOR,
  helloPageLinkGeneratorV1,
} from './url_generator';

declare module '../../../src/plugins/share/public' {
  export interface UrlGeneratorStateMapping {
    [HELLO_URL_GENERATOR_V1]: LegacyHelloLinkGeneratorState;
    [HELLO_URL_GENERATOR]: HelloLinkGeneratorState;
  }
}

interface StartDeps {
  share: SharePluginStart;
}

interface SetupDeps {
  share: SharePluginSetup;
}

const APP_ID = 'urlGeneratorsExamples';

export class AccessLinksExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { share: { urlGenerators } }: SetupDeps) {
    urlGenerators.registerUrlGenerator(
      createHelloPageLinkGenerator(async () => ({
        appBasePath: (await core.getStartServices())[0].application.getUrlForApp(APP_ID),
      }))
    );

    urlGenerators.registerUrlGenerator(helloPageLinkGeneratorV1);

    core.application.register({
      id: APP_ID,
      title: 'Access links examples',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./app');
        return renderApp(
          {
            appBasePath: params.appBasePath,
          },
          params
        );
      },
    });
  }

  public start() {}

  public stop() {}
}
