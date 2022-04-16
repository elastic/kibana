/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins, DataViewEditorProps } from './types';
import { getEditorOpener } from './open_editor';
import { DataViewEditor } from './components/data_view_editor';

export class DataViewEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins>
{
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const { application, uiSettings, docLinks, http, notifications } = core;
    const { data, dataViews } = plugins;

    return {
      /**
       * Data view editor flyout via function interface
       * @param DataViewEditorProps - data view editor config
       * @returns method to close editor
       */
      openEditor: getEditorOpener({
        core,
        dataViews,
        searchClient: data.search.search,
      }),
      /**
       * Data view editor flyout via react component
       * @param DataViewEditorProps - data view editor config
       * @returns JSX.Element
       */
      IndexPatternEditorComponent: (props: DataViewEditorProps) => (
        <DataViewEditor
          services={{
            uiSettings,
            docLinks,
            http,
            notifications,
            application,
            dataViews,
            searchClient: data.search.search,
          }}
          {...props}
        />
      ),
      /**
       * Convenience method to determine whether the user can create or edit edit data views.
       *
       * @returns boolean
       */
      userPermissions: {
        editDataView: () => dataViews.getCanSaveSync(),
      },
    };
  }

  public stop() {
    return {};
  }
}
