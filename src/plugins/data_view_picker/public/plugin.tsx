/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Plugin, CoreSetup, CoreStart } from 'src/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins, DataViewPickerProps } from './types';
import { DataViewPicker } from './components/data_view_picker';

export class DataViewPickerPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins>
{
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const { application, uiSettings, http } = core;
    const { dataViews, dataViewFieldEditor, dataViewEditor } = plugins;

    return {
      /**
       * Data view editor flyout via react component
       * @param DataViewPickerProps - data view editor config
       * @returns JSX.Element
       */
      DataViewPickerComponent: (props: DataViewPickerProps) => (
        <DataViewPicker
          services={{
            uiSettings,
            http,
            application,
            dataViews,
            dataViewFieldEditor,
            dataViewEditor,
          }}
          {...props}
        />
      ),
    };
  }

  public stop() {
    return {};
  }
}
