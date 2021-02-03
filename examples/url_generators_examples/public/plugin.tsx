/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
