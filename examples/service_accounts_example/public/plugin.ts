/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

import { APP_ID, APP_TITLE } from '../common/constants';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class ServiceAccountsExamplePlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, { developerExamples }: SetupDeps) {
    core.application.register({
      id: APP_ID,
      title: APP_TITLE,
      visibleIn: ['classicSideNav', 'home', 'globalSearch', 'kibanaOverview', 'projectSideNav'],
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(coreStart, params.element);
      },
    });

    developerExamples.register({
      appId: APP_ID,
      title: APP_TITLE,
      description:
        'Own a workload, attach a UIAM service account, run as that account, and inspect identities.',
    });
  }

  public start(_core: CoreStart) {}

  public stop() {}
}
