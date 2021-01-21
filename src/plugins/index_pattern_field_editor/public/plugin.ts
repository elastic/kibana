/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';
import { getFieldEditorLoader } from './load_editor';

export class IndexPatternFieldEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {
      loadEditor: getFieldEditorLoader(core),
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    return {};
  }

  public stop() {
    return {};
  }
}
