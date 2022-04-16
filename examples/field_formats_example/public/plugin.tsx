/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  AppMountParameters,
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import {
  IndexPatternFieldEditorStart,
  IndexPatternFieldEditorSetup,
} from '@kbn/data-view-field-editor-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { registerExampleFormat } from './examples/2_creating_custom_formatter';
import { App } from './app';
import { registerExampleFormatEditor } from './examples/3_creating_custom_format_editor';
import img from './formats.png';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  fieldFormats: FieldFormatsSetup;
  dataViewFieldEditor: IndexPatternFieldEditorSetup;
}

interface StartDeps {
  fieldFormats: FieldFormatsStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  data: DataPublicPluginStart;
}

export class FieldFormatsExamplePlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    registerExampleFormat(deps.fieldFormats);
    registerExampleFormatEditor(deps.dataViewFieldEditor);

    // just for demonstration purposes:
    // opens a field editor using default data view and first number field
    const openDateViewNumberFieldEditor = async () => {
      const [, plugins] = await core.getStartServices();
      const dataView = await plugins.data.dataViews.getDefault();
      if (!dataView) {
        alert('Create at least one data view to continue with this example');
        return;
      }

      const numberField = dataView.fields
        .getAll()
        .find((f) => !f.name.startsWith('_') && f.type === KBN_FIELD_TYPES.NUMBER && !f.scripted);

      if (!numberField) {
        alert(
          'Default data view needs at least a single field of type `number` to continue with this example'
        );
        return;
      }

      plugins.dataViewFieldEditor.openEditor({
        ctx: {
          dataView,
        },
        fieldName: numberField.name,
      });
    };

    // Register an application into the side navigation menu
    core.application.register({
      id: 'fieldFormatsExample',
      title: 'Field formats example',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount({ element }: AppMountParameters) {
        const [, plugins] = await core.getStartServices();
        ReactDOM.render(
          <App deps={{ fieldFormats: plugins.fieldFormats, openDateViewNumberFieldEditor }} />,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    // This section is only needed to get this example plugin to show up in our Developer Examples.
    deps.developerExamples.register({
      appId: 'fieldFormatsExample',
      title: 'Field formats example',
      description: `Learn how to use an existing field formats or how to create a custom one`,
      image: img,
    });
  }
  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
