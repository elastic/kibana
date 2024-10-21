/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import { registerEmbeddable } from './register_embeddable';
import { registerUiActions } from './register_ui_actions';

import type {
  JsSandboxPluginSetup,
  JsSandboxPluginSetupDeps,
  JsSandboxPluginStart,
  JsSandboxPluginStartDeps,
} from './types';

export class JsSandboxPlugin
  implements
    Plugin<
      JsSandboxPluginSetup,
      JsSandboxPluginStart,
      JsSandboxPluginSetupDeps,
      JsSandboxPluginStartDeps
    >
{
  public setup(
    core: CoreSetup<JsSandboxPluginStartDeps, JsSandboxPluginStart>,
    { embeddable, uiActions }: JsSandboxPluginSetupDeps
  ): JsSandboxPluginSetup {
    core.getStartServices().then(([coreStart, pluginStart]) => {
      if (embeddable) {
        registerEmbeddable(embeddable, core.getStartServices);
      }

      if (uiActions) {
        registerUiActions(uiActions, coreStart, pluginStart);
      }
    });

    return {};
  }

  public start(core: CoreStart): JsSandboxPluginStart {
    return {};
  }

  public stop() {}
}
