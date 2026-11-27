/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDeps {
  share?: SharePluginStart;
}

export class TrailblazerPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        const [[coreStart, startDeps], { mountApp }] = await Promise.all([
          core.getStartServices(),
          import('./application'),
        ]);
        return mountApp(coreStart, startDeps, params);
      },
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description:
        'A Trailblazer-style multi-pane browser: walk from indices to documents, fields, and value distributions, with each selection opening a new pane to the right.',
    });
  }

  public start() {}

  public stop() {}
}
