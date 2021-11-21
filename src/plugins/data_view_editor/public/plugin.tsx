/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Plugin, CoreSetup, CoreStart } from 'src/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins, DataViewEditorProps } from './types';
import { getEditorOpener } from './open_editor';
import { IndexPatternEditor } from './components/data_view_editor';

export class DataViewEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins>
{
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const { application, uiSettings, docLinks, http, notifications } = core;
    const { data } = plugins;

    return {
      /**
       * Index pattern editor flyout via function interface
       * @param IndexPatternEditorProps - index pattern editor config
       * @returns method to close editor
       */
      openEditor: getEditorOpener({
        core,
        indexPatternService: data.indexPatterns,
        searchClient: data.search.search,
      }),
      /**
       * Index pattern editor flyout via react component
       * @param IndexPatternEditorProps - index pattern editor config
       * @returns JSX.Element
       */
      IndexPatternEditorComponent: (props: DataViewEditorProps) => (
        <IndexPatternEditor
          services={{
            uiSettings,
            docLinks,
            http,
            notifications,
            application,
            indexPatternService: data.indexPatterns,
            searchClient: data.search.search,
          }}
          {...props}
        />
      ),
      /**
       * Convenience method to determine whether the user can create or edit edit the index patterns.
       *
       * @returns boolean
       */
      userPermissions: {
        editDataView: () => {
          return application.capabilities.management.kibana.indexPatterns;
        },
      },
    };
  }

  public stop() {
    return {};
  }
}
