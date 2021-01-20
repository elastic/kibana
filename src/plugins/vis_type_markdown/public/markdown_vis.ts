/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { MarkdownOptions } from './markdown_options';
import { SettingsOptions } from './settings_options_lazy';
import { DefaultEditorSize } from '../../vis_default_editor/public';
import { VisGroups } from '../../visualizations/public';
import { toExpressionAst } from './to_ast';

export const markdownVisDefinition = {
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
  },
  requestHandler: 'none',
  responseHandler: 'none',
  inspectorAdapters: {},
};
