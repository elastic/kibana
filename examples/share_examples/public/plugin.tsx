/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharePluginStart, SharePluginSetup } from '../../../src/plugins/share/public';
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';

interface SetupDeps {
  share: SharePluginSetup;
}

interface StartDeps {
  share: SharePluginStart;
}

export class ShareDemoPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { share }: SetupDeps) {
    share.register({
      id: 'demo',
      getShareMenuItems: (context) => [
        {
          panel: {
            id: 'demo',
            title: 'Panel title',
            content: 'Panel content',
          },
          shareMenuItem: {
            name: 'Demo list item (from share_example plugin)',
          },
        },
      ],
    });
  }

  public start(core: CoreStart, { share }: StartDeps) {}

  public stop() {}
}
