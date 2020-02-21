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

import { Plugin, CoreSetup, AppMountParameters } from '../../../src/core/public';
import {
  DirectAccessLinksStart,
  DirectAccessLinksSetup,
} from '../../../src/plugins/direct_access_links/public';
import {
  HelloLinkGeneratorState,
  createHelloPageLinkGenerator,
  LegacyHelloLinkGeneratorState,
  HELLO_LINK_GENERATOR_V1,
  HELLO_LINK_GENERATOR,
  helloPageLinkGeneratorV1,
} from './direct_access_link_generator';

declare module '../../../src/plugins/direct_access_links/public' {
  export interface DirectAccessLinkGeneratorStateMapping {
    [HELLO_LINK_GENERATOR_V1]: LegacyHelloLinkGeneratorState;
    [HELLO_LINK_GENERATOR]: HelloLinkGeneratorState;
  }
}

interface StartDeps {
  directAccessLinks: DirectAccessLinksStart;
}

interface SetupDeps {
  directAccessLinks: DirectAccessLinksSetup;
}

const APP_ID = 'accessLinksExamples';

export class AccessLinksExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { directAccessLinks }: SetupDeps) {
    directAccessLinks.registerAccessLinkGenerator(
      HELLO_LINK_GENERATOR,
      createHelloPageLinkGenerator(async () => ({
        appBasePath: (await core.getStartServices())[0].application.getUrlForApp(APP_ID),
      }))
    );

    directAccessLinks.registerAccessLinkGenerator(
      HELLO_LINK_GENERATOR_V1,
      helloPageLinkGeneratorV1
    );

    core.application.register({
      id: APP_ID,
      title: 'Access links examples',
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
