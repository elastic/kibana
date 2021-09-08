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
} from '../../../src/core/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import { App } from './app';
import { FieldFormatsSetup, FieldFormatsStart } from '../../../src/plugins/field_formats/public';
import { registerExampleFormat } from './examples/2_creating_custom_formatter';
import {
  IndexPatternFieldEditorStart,
  IndexPatternFieldEditorSetup,
} from '../../../src/plugins/index_pattern_field_editor/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { registerExampleFormatEditor } from './examples/3_creating_custom_format_editor';
import img from './formats.png';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  fieldFormats: FieldFormatsSetup;
  indexPatternFieldEditor: IndexPatternFieldEditorSetup;
}

interface StartDeps {
  fieldFormats: FieldFormatsStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  data: DataPublicPluginStart;
}

export class FieldFormatsExamplePlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    registerExampleFormat(deps.fieldFormats);
    registerExampleFormatEditor(deps.indexPatternFieldEditor);

    // just for demonstration purposes:
    // opens a field editor using default index pattern and first number field
    const openIndexPatternNumberFieldEditor = async () => {
      const [, plugins] = await core.getStartServices();
      const indexPattern = await plugins.data.indexPatterns.getDefault();
      if (!indexPattern) {
        alert('Creating at least one index pattern to continue with this example');
        return;
      }

      const numberField = indexPattern
        .getNonScriptedFields()
        .find((f) => !f.name.startsWith('_') && f.type === KBN_FIELD_TYPES.NUMBER);

      if (!numberField) {
        alert(
          'Default index pattern needs at least a single field of type `number` to continue with this example'
        );
        return;
      }

      plugins.indexPatternFieldEditor.openEditor({
        ctx: {
          indexPattern,
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
          <App deps={{ fieldFormats: plugins.fieldFormats, openIndexPatternNumberFieldEditor }} />,
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
