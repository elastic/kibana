/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DownloadPngAction } from './actions/download_png/download_png_action';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';

export interface ShareToPluginSetupDeps {
  uiActions: UiActionsSetup;
}

export interface ShareToPluginStartDeps {
  uiActions: UiActionsStart;
}

export interface ShareToSetup {
}

export interface ShareToStart {
}

export class ShareToPublicPlugin implements Plugin<ShareToSetup, ShareToStart, ShareToPluginSetupDeps, ShareToPluginStartDeps> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ShareToPluginSetupDeps) {
    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, new DownloadPngAction());

    return {};
  }

  public start(core: CoreStart, plugins: ShareToPluginStartDeps) {

    return {};
  }

  public stop() {}
}
