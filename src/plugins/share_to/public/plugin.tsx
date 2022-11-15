/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { DownloadPngAction } from './actions/download_png/download_png_action';

export interface ShareToPluginSetupDeps {
  uiActions: UiActionsSetup;
}

export interface ShareToPluginStartDeps {
  uiActions: UiActionsStart;
}

export interface ShareToSetup {}

export interface ShareToStart {}

export class ShareToPublicPlugin
  implements Plugin<ShareToSetup, ShareToStart, ShareToPluginSetupDeps, ShareToPluginStartDeps>
{
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ShareToPluginSetupDeps) {
    const downloadPngAction = new DownloadPngAction({
      http: core.http,
    });

    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, downloadPngAction);

    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, {
      type: 'DOWNLOAD_PDF',
      id: 'DOWNLOAD_PDF',
      grouping: [
        {
          id: 'share',
          getDisplayName: () => 'Share',
        },
      ],
      getDisplayName: () => 'Download as PDF',
      getIconType() {
        return 'download';
      },
      isCompatible: async () => {
        return true;
      },
      execute: async () => {},
    });

    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, {
      type: 'SHARE_EMAIL',
      id: 'SHARE_EMAIL',
      grouping: [
        {
          id: 'share',
          getDisplayName: () => 'Share',
        },
      ],
      getDisplayName: () => 'Send by email',
      getIconType() {
        return 'email';
      },
      isCompatible: async () => {
        return true;
      },
      execute: async () => {},
    });

    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, {
      type: 'SHARE_SLACK',
      id: 'SHARE_SLACK',
      grouping: [
        {
          id: 'share',
          getDisplayName: () => 'Share',
        },
      ],
      getDisplayName: () => 'Send to Slack',
      getIconType() {
        return 'share';
      },
      isCompatible: async () => {
        return true;
      },
      execute: async () => {},
    });

    return {};
  }

  public start(core: CoreStart, plugins: ShareToPluginStartDeps) {
    return {};
  }

  public stop() {}
}
