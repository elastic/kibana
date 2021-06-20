/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';
import { getEditorOpener } from './open_editor';
import { IndexPatternManagementService } from './service';

export class IndexPatternEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private readonly indexPatternManagementService = new IndexPatternManagementService();
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const {
      application: { capabilities },
    } = core;
    const { data } = plugins;

    const ipMgmtService = this.indexPatternManagementService.start({
      httpClient: core.http,
      uiSettings: core.uiSettings,
    });

    return {
      openEditor: getEditorOpener({
        core,
        indexPatternService: data.indexPatterns,
        indexPatternCreateService: ipMgmtService,
      }),
      userPermissions: {
        editIndexPattern: () => {
          return capabilities.management.kibana.indexPatterns;
        },
      },
      indexPatternCreateService: ipMgmtService,
    };
  }

  public stop() {
    return {};
  }
}
