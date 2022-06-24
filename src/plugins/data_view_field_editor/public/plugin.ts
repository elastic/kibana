/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';

import type { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';
import { getFieldEditorOpener } from './open_editor';
import { FormatEditorService } from './service/format_editor_service';
import { getDeleteFieldProvider } from './components/delete_field_provider';
import { getFieldDeleteModalOpener } from './open_delete_modal';
import { initApi } from './lib/api';

export class IndexPatternFieldEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins>
{
  private readonly formatEditorService = new FormatEditorService();

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    const { fieldFormatEditors } = this.formatEditorService.setup();

    return {
      fieldFormatEditors,
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const { fieldFormatEditors } = this.formatEditorService.start();
    const { http } = core;
    const { data, usageCollection, dataViews, fieldFormats } = plugins;
    const openDeleteModal = getFieldDeleteModalOpener({
      core,
      dataViews,
      usageCollection,
    });
    return {
      fieldFormatEditors,
      openEditor: getFieldEditorOpener({
        core,
        dataViews,
        apiService: initApi(http),
        fieldFormats,
        fieldFormatEditors,
        search: data.search,
        usageCollection,
      }),
      openDeleteModal,
      userPermissions: {
        editIndexPattern: () => dataViews.getCanSaveSync(),
      },
      DeleteRuntimeFieldProvider: getDeleteFieldProvider(openDeleteModal),
    };
  }

  public stop() {
    return {};
  }
}
