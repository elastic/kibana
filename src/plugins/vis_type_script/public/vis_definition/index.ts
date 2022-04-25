/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { DefaultEditorSize } from '../../../vis_default_editor/public';
import { VisGroups, VisTypeDefinition } from '../../../visualizations/public';
import { ScriptOptions } from './editor_options/script';
import { SettingsOptions } from './editor_options/settings_lazy';
import { toExpressionAst } from '../expression/to_ast';
import { VisParams } from '../types';

export const scriptVisDefinition: VisTypeDefinition<VisParams> = {
  name: 'script',
  title: 'Script-based',
  isAccessible: true,
  icon: 'visText',
  group: VisGroups.TOOLS,
  titleInWizard: i18n.translate('visTypeScript.titleInWizard', {
    defaultMessage: 'Script-based',
  }),
  description: i18n.translate('visTypeScript.description', {
    defaultMessage: 'Create custom visualizations with a script (e.g. D3).',
  }),
  toExpressionAst,
  visConfig: {
    defaults: {},
  },
  editorConfig: {
    optionTabs: [
      {
        name: 'advanced',
        title: i18n.translate('visTypeMarkdown.tabs.dataText', {
          defaultMessage: 'Data',
        }),
        editor: ScriptOptions,
      },
      {
        name: 'options',
        title: i18n.translate('visTypeMarkdown.tabs.optionsText', {
          defaultMessage: 'Options',
        }),
        editor: SettingsOptions,
      },
    ],
    enableAutoApply: true,
    defaultSize: DefaultEditorSize.LARGE,
  },
  options: {
    showTimePicker: false,
    showFilterBar: false,
  },
  inspectorAdapters: {},
};
