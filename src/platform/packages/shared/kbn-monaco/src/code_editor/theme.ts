/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiDarkVars as darkTheme, euiLightVars as lightTheme } from '@kbn/ui-theme';
import { monaco } from '../..';

export function createTheme(
  euiTheme: typeof darkTheme | typeof lightTheme,
  selectionBackgroundColor: string,
  backgroundColor?: string
): monaco.editor.IStandaloneThemeData {
  return {
    base: 'vs',
    inherit: true,
    rules: [
      {
        token: '',
        foreground: euiTheme.euiColorDarkestShade,
        background: euiTheme.euiFormBackgroundColor,
      },
      { token: 'invalid', foreground: euiTheme.euiColorAccentText },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },

      { token: 'variable', foreground: euiTheme.euiColorPrimaryText },
      { token: 'variable.predefined', foreground: euiTheme.euiColorSuccessText },
      { token: 'constant', foreground: euiTheme.euiColorAccentText },
      { token: 'comment', foreground: euiTheme.euiTextSubduedColor },
      { token: 'number', foreground: euiTheme.euiColorAccentText },
      { token: 'number.hex', foreground: euiTheme.euiColorAccentText },
      { token: 'regexp', foreground: euiTheme.euiColorDangerText },
      { token: 'annotation', foreground: euiTheme.euiTextSubduedColor },
      { token: 'type', foreground: euiTheme.euiColorSuccessText },

      { token: 'delimiter', foreground: euiTheme.euiTextSubduedColor },
      { token: 'delimiter.html', foreground: euiTheme.euiColorDarkShade },
      { token: 'delimiter.xml', foreground: euiTheme.euiColorPrimaryText },

      { token: 'tag', foreground: euiTheme.euiColorDangerText },
      { token: 'tag.id.jade', foreground: euiTheme.euiColorPrimaryText },
      { token: 'tag.class.jade', foreground: euiTheme.euiColorPrimaryText },
      { token: 'meta.scss', foreground: euiTheme.euiColorAccentText },
      { token: 'metatag', foreground: euiTheme.euiColorSuccessText },
      { token: 'metatag.content.html', foreground: euiTheme.euiColorDangerText },
      { token: 'metatag.html', foreground: euiTheme.euiTextSubduedColor },
      { token: 'metatag.xml', foreground: euiTheme.euiTextSubduedColor },
      { token: 'metatag.php', fontStyle: 'bold' },

      { token: 'key', foreground: euiTheme.euiColorWarningText },
      { token: 'string.key.json', foreground: euiTheme.euiColorDangerText },
      { token: 'string.value.json', foreground: euiTheme.euiColorPrimaryText },

      { token: 'attribute.name', foreground: euiTheme.euiColorDangerText },
      { token: 'attribute.name.css', foreground: euiTheme.euiColorSuccessText },
      { token: 'attribute.value', foreground: euiTheme.euiColorPrimaryText },
      { token: 'attribute.value.number', foreground: euiTheme.euiColorWarningText },
      { token: 'attribute.value.unit', foreground: euiTheme.euiColorWarningText },
      { token: 'attribute.value.html', foreground: euiTheme.euiColorPrimaryText },
      { token: 'attribute.value.xml', foreground: euiTheme.euiColorPrimaryText },

      { token: 'string', foreground: euiTheme.euiColorDangerText },
      { token: 'string.html', foreground: euiTheme.euiColorPrimaryText },
      { token: 'string.sql', foreground: euiTheme.euiColorDangerText },
      { token: 'string.yaml', foreground: euiTheme.euiColorPrimaryText },

      { token: 'keyword', foreground: euiTheme.euiColorPrimaryText },
      { token: 'keyword.json', foreground: euiTheme.euiColorPrimaryText },
      { token: 'keyword.flow', foreground: euiTheme.euiColorWarningText },
      { token: 'keyword.flow.scss', foreground: euiTheme.euiColorPrimaryText },
      // Monaco editor supports strikethrough font style only starting from 0.32.0.
      { token: 'keyword.deprecated', foreground: euiTheme.euiColorAccentText },

      { token: 'operator.scss', foreground: euiTheme.euiColorDarkShade },
      { token: 'operator.sql', foreground: euiTheme.euiTextSubduedColor },
      { token: 'operator.swift', foreground: euiTheme.euiTextSubduedColor },
      { token: 'predefined.sql', foreground: euiTheme.euiTextSubduedColor },

      { token: 'text', foreground: euiTheme.euiTitleColor },
      { token: 'label', foreground: euiTheme.euiColorVis9 },
    ],
    colors: {
      'editor.foreground': euiTheme.euiColorDarkestShade,
      'editor.background': backgroundColor ?? euiTheme.euiFormBackgroundColor,
      'editorLineNumber.foreground': euiTheme.euiColorDarkShade,
      'editorLineNumber.activeForeground': euiTheme.euiColorDarkShade,
      'editorIndentGuide.background1': euiTheme.euiColorLightShade,
      'editor.selectionBackground': selectionBackgroundColor,
      'editorWidget.border': euiTheme.euiColorLightShade,
      'editorWidget.background': euiTheme.euiColorLightestShade,
      'editorCursor.foreground': euiTheme.euiColorDarkestShade,
      'editorSuggestWidget.selectedForeground': euiTheme.euiColorDarkestShade,
      'editorSuggestWidget.focusHighlightForeground': euiTheme.euiColorPrimary,
      'editorSuggestWidget.selectedBackground': euiTheme.euiColorLightShade,
      'list.hoverBackground': euiTheme.euiColorLightShade,
      'list.highlightForeground': euiTheme.euiColorPrimary,
      'editor.lineHighlightBorder': euiTheme.euiColorLightestShade,
      'editorHoverWidget.foreground': euiTheme.euiColorDarkestShade,
      'editorHoverWidget.background': euiTheme.euiFormBackgroundColor,
    },
  };
}

export const buildDarkTheme = () => createTheme(darkTheme, '#343551');
export const buildLightTheme = () => createTheme(lightTheme, '#E3E4ED');
export const buildDarkTransparentTheme = () => createTheme(darkTheme, '#343551', '#00000000');
export const buildLightTransparentTheme = () => createTheme(lightTheme, '#E3E4ED', '#00000000');
