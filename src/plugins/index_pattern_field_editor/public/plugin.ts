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
import { FormatEditorService } from './service';

export class IndexPatternFieldEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private readonly formatEditorService = new FormatEditorService();

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    const { fieldFormatEditors } = this.formatEditorService.setup();

    return {
      fieldFormatEditors,
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const { fieldFormatEditors } = this.formatEditorService.start();
    const {
      application: { capabilities },
    } = core;
    const { data } = plugins;

    return {
      fieldFormatEditors,
      openEditor: getFieldEditorOpener(core, data.indexPatterns),
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
