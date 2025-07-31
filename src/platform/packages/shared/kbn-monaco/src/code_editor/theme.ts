/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { monaco } from '../..';

export function createTheme(
  { euiTheme }: UseEuiTheme,
  backgroundColor?: string
): monaco.editor.IStandaloneThemeData {
  return {
    base: 'vs',
    inherit: true,
    rules: [
      {
        token: '',
        foreground: euiTheme.colors.textParagraph,
        background: euiTheme.colors.backgroundBaseSubdued,
      },
      { token: 'invalid', foreground: euiTheme.colors.textAccent },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },

      { token: 'variable', foreground: euiTheme.colors.textPrimary },
      { token: 'variable.predefined', foreground: euiTheme.colors.textSuccess },
      { token: 'constant', foreground: euiTheme.colors.textAccent },
      { token: 'comment', foreground: euiTheme.colors.textSubdued },
      { token: 'number', foreground: euiTheme.colors.textAccent },
      { token: 'number.hex', foreground: euiTheme.colors.textAccent },
      { token: 'regexp', foreground: euiTheme.colors.textDanger },
      { token: 'annotation', foreground: euiTheme.colors.textSubdued },
      { token: 'type', foreground: euiTheme.colors.textSuccess },

      { token: 'delimiter', foreground: euiTheme.colors.textSubdued },
      { token: 'delimiter.html', foreground: euiTheme.colors.textParagraph },
      { token: 'delimiter.xml', foreground: euiTheme.colors.textPrimary },

      { token: 'tag', foreground: euiTheme.colors.textDanger },
      { token: 'tag.id.jade', foreground: euiTheme.colors.textPrimary },
      { token: 'tag.class.jade', foreground: euiTheme.colors.textPrimary },
      { token: 'meta.scss', foreground: euiTheme.colors.textAccent },
      { token: 'metatag', foreground: euiTheme.colors.textSuccess },
      { token: 'metatag.content.html', foreground: euiTheme.colors.textDanger },
      { token: 'metatag.html', foreground: euiTheme.colors.textDanger },
      { token: 'metatag.xml', foreground: euiTheme.colors.textSubdued },
      { token: 'metatag.php', fontStyle: 'bold' },

      { token: 'key', foreground: euiTheme.colors.textWarning },
      { token: 'string.key.json', foreground: euiTheme.colors.textDanger },
      { token: 'string.value.json', foreground: euiTheme.colors.textPrimary },

      { token: 'attribute.name', foreground: euiTheme.colors.textDanger },
      { token: 'attribute.name.css', foreground: euiTheme.colors.textSuccess },
      { token: 'attribute.value', foreground: euiTheme.colors.textPrimary },
      { token: 'attribute.value.number', foreground: euiTheme.colors.textWarning },
      { token: 'attribute.value.unit', foreground: euiTheme.colors.textWarning },
      { token: 'attribute.value.html', foreground: euiTheme.colors.textPrimary },
      { token: 'attribute.value.xml', foreground: euiTheme.colors.textPrimary },

      { token: 'string', foreground: euiTheme.colors.textDanger },
      { token: 'string.html', foreground: euiTheme.colors.textPrimary },
      { token: 'string.sql', foreground: euiTheme.colors.textDanger },
      { token: 'string.yaml', foreground: euiTheme.colors.textPrimary },

      { token: 'keyword', foreground: euiTheme.colors.textPrimary },
      { token: 'keyword.json', foreground: euiTheme.colors.textPrimary },
      { token: 'keyword.flow', foreground: euiTheme.colors.textWarning },
      { token: 'keyword.flow.scss', foreground: euiTheme.colors.textPrimary },
      // Monaco editor supports strikethrough font style only starting from 0.32.0.
      { token: 'keyword.deprecated', foreground: euiTheme.colors.textAccent },

      { token: 'operator.scss', foreground: euiTheme.colors.textParagraph },
      { token: 'operator.sql', foreground: euiTheme.colors.textSubdued },
      { token: 'operator.swift', foreground: euiTheme.colors.textSubdued },
      { token: 'predefined.sql', foreground: euiTheme.colors.textSubdued },

      { token: 'text', foreground: euiTheme.colors.textHeading },
      { token: 'label', foreground: euiTheme.colors.vis.euiColorVis9 },
    ],
    colors: {
      'editor.foreground': euiTheme.colors.textParagraph,
      'editor.background': backgroundColor ?? euiTheme.colors.backgroundBasePlain,
      'editorLineNumber.foreground': euiTheme.colors.textSubdued,
      'editorLineNumber.activeForeground': euiTheme.colors.textSubdued,
      'editorIndentGuide.background1': euiTheme.colors.lightShade,
      'editor.selectionBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
      'editorWidget.border': euiTheme.colors.borderBasePlain,
      'editorWidget.background': euiTheme.colors.backgroundBaseSubdued,
      'editorCursor.foreground': euiTheme.colors.darkestShade,
      'editorSuggestWidget.selectedForeground': euiTheme.colors.darkestShade,
      'editorSuggestWidget.focusHighlightForeground': euiTheme.colors.primary,
      'editorSuggestWidget.selectedBackground': euiTheme.colors.lightShade,
      'list.hoverBackground': euiTheme.colors.backgroundBaseSubdued,
      'list.highlightForeground': euiTheme.colors.primary,
      'editor.lineHighlightBorder': euiTheme.colors.lightestShade,
      'editorHoverWidget.foreground': euiTheme.colors.darkestShade,
      'editorHoverWidget.background': euiTheme.colors.backgroundBaseSubdued,
      'diffEditor.insertedTextBackground': euiTheme.colors.borderBaseSuccess,
      'diffEditor.removedTextBackground': euiTheme.colors.borderBaseDanger,
      'diffEditor.insertedLineBackground': euiTheme.colors.backgroundBaseSuccess,
      'diffEditor.removedLineBackground': euiTheme.colors.backgroundBaseDanger,
    },
  };
}

export const buildTheme = createTheme;
export const buildTransparentTheme = (euiTheme: UseEuiTheme) => createTheme(euiTheme, '#00000000');
