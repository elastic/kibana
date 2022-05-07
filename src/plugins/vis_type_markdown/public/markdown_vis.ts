/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { DefaultEditorSize } from '@kbn/vis-default-editor-plugin/public';
import { VisGroups, VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import { MarkdownOptions } from './markdown_options';
import { SettingsOptions } from './settings_options_lazy';
import { toExpressionAst } from './to_ast';
import { MarkdownVisParams } from './types';

export const markdownVisDefinition: VisTypeDefinition<MarkdownVisParams> = {
  name: 'markdown',
  title: 'Markdown',
  isAccessible: true,
  icon: 'visText',
  group: VisGroups.TOOLS,
  titleInWizard: i18n.translate('visTypeMarkdown.markdownTitleInWizard', {
    defaultMessage: 'Text',
  }),
  description: i18n.translate('visTypeMarkdown.markdownDescription', {
    defaultMessage: 'Add text and images to your dashboard.',
  }),
  toExpressionAst,
  visConfig: {
    defaults: {
      fontSize: 12,
      openLinksInNewTab: false,
      markdown: '',
    },
  },
  editorConfig: {
    optionTabs: [
      {
        name: 'advanced',
        title: i18n.translate('visTypeMarkdown.tabs.dataText', {
          defaultMessage: 'Data',
        }),
        editor: MarkdownOptions,
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
    showQueryBar: true,
    showQueryInput: false,
  },
  inspectorAdapters: {},
};
