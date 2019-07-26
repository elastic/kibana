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

import { IStandaloneThemeData } from 'monaco-editor';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

export const getThemeConfig = (themeName: 'dark' | 'light'): IStandaloneThemeData => {
  const theme = themeName === 'light' ? lightTheme : darkTheme;
  return {
    base: 'vs',
    inherit: true,
    rules: [
      {
        token: '',
        foreground: theme.euiColorDarkestShade,
        background: theme.euiColorEmptyShade,
      },
      { token: 'invalid', foreground: theme.euiColorAccent },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },

      { token: 'variable', foreground: theme.euiColorPrimary },
      { token: 'variable.predefined', foreground: theme.euiColorSecondary },
      { token: 'constant', foreground: theme.euiColorAccent },
      { token: 'comment', foreground: theme.euiColorMediumShade },
      { token: 'number', foreground: theme.euiColorWarning },
      { token: 'number.hex', foreground: theme.euiColorPrimary },
      { token: 'regexp', foreground: theme.euiColorDanger },
      { token: 'annotation', foreground: theme.euiColorMediumShade },
      { token: 'type', foreground: theme.euiColorVis0 },

      { token: 'delimiter', foreground: theme.euiColorDarkestShade },
      { token: 'delimiter.html', foreground: theme.euiColorDarkShade },
      { token: 'delimiter.xml', foreground: theme.euiColorPrimary },

      { token: 'tag', foreground: theme.euiColorDanger },
      { token: 'tag.id.jade', foreground: theme.euiColorPrimary },
      { token: 'tag.class.jade', foreground: theme.euiColorPrimary },
      { token: 'meta.scss', foreground: theme.euiColorAccent },
      { token: 'metatag', foreground: theme.euiColorSecondary },
      { token: 'metatag.content.html', foreground: theme.euiColorDanger },
      { token: 'metatag.html', foreground: theme.euiColorMediumShade },
      { token: 'metatag.xml', foreground: theme.euiColorMediumShade },
      { token: 'metatag.php', fontStyle: 'bold' },

      { token: 'key', foreground: theme.euiColorWarning },
      { token: 'string.key.json', foreground: theme.euiColorDanger },
      { token: 'string.value.json', foreground: theme.euiColorPrimary },

      { token: 'attribute.name', foreground: theme.euiColorDanger },
      { token: 'attribute.name.css', foreground: theme.euiColorSecondary },
      { token: 'attribute.value', foreground: theme.euiColorPrimary },
      { token: 'attribute.value.number', foreground: theme.euiColorWarning },
      { token: 'attribute.value.unit', foreground: theme.euiColorWarning },
      { token: 'attribute.value.html', foreground: theme.euiColorPrimary },
      { token: 'attribute.value.xml', foreground: theme.euiColorPrimary },

      { token: 'string', foreground: theme.euiColorLightestShade },
      { token: 'string.html', foreground: theme.euiColorPrimary },
      { token: 'string.sql', foreground: theme.euiColorDanger },
      { token: 'string.yaml', foreground: theme.euiColorPrimary },

      { token: 'keyword', foreground: theme.euiColorPrimary },
      { token: 'keyword.json', foreground: theme.euiColorPrimary },
      { token: 'keyword.flow', foreground: theme.euiColorWarning },
      { token: 'keyword.flow.scss', foreground: theme.euiColorPrimary },

      { token: 'operator.scss', foreground: theme.euiColorDarkShade },
      { token: 'operator.sql', foreground: theme.euiColorMediumShade },
      { token: 'operator.swift', foreground: theme.euiColorMediumShade },
      { token: 'predefined.sql', foreground: theme.euiColorMediumShade },
    ],
    colors: {
      'editor.foreground': syntaxTheme.foreground,
      'editor.background': syntaxTheme.editorBackground,
      'editorLineNumber.foreground': syntaxTheme.lineNumbers,
      'editorLineNumber.activeForeground': syntaxTheme.lineNumbers,
      'editorIndentGuide.background': syntaxTheme.editorIndentGuide,
      'editor.selectionBackground': syntaxTheme.selectionBackground,
      'editorWidget.border': syntaxTheme.editorWidgetBorder,
      'editorWidget.background': syntaxTheme.editorWidgetBackground,
    },
  };
};
