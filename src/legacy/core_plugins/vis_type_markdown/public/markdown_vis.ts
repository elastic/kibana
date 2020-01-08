/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';

import { DefaultEditorSize } from '../../visualizations/public';

import { MarkdownVisWrapper } from './markdown_vis_controller';
import { MarkdownOptions } from './markdown_options';
import { SettingsOptions } from './settings_options';

export const markdownVisDefinition = {
  name: 'markdown',
  title: 'Markdown',
  isAccessible: true,
  icon: 'visText',
  description: i18n.translate('visTypeMarkdown.markdownDescription', {
    defaultMessage: 'Create a document using markdown syntax',
  }),
  visConfig: {
    component: MarkdownVisWrapper,
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
};
