/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

export interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDeps {}

const APP_ID = 'PlatformFlyoutApp';
const title = 'Platform flyouts';

export class PlatformFlyoutExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: APP_ID,
      title,
      visibleIn: [],
      async mount(mountParams: AppMountParameters) {
        const { renderApp } = await import('./app');
        const [coreStart, deps] = await core.getStartServices();
        return renderApp(coreStart, deps, mountParams);
      },
    });
    developerExamples.register({
      appId: APP_ID,
      title,
      description: `Displays use cases for the Platform flyouts service`,
    });
  }

  public start(_core: CoreStart, _deps: StartDeps) {}

  public stop() {}
}
