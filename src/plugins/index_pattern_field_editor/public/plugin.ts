/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';
import { getFieldEditorOpener } from './open_editor';

export class IndexPatternFieldEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const {
      application: { capabilities },
    } = core;

    return {
      openEditor: getFieldEditorOpener(core),
      userPermissions: {
        editIndexPattern: () => {
          return capabilities.management.kibana.indexPatterns;
        },
      },
    };
  }

  public stop() {
    return {};
  }
}
