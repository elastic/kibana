/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComponentSelector, css, CSSObject, SerializedStyles } from '@emotion/react';
import { ArrayCSSInterpolation } from '@emotion/serialize';
import { Property } from 'csstype';

import { monaco } from '@kbn/monaco';
import { euiLightVars as lightTheme, euiDarkVars as darkTheme } from '@kbn/ui-theme';

export const codeEditorMonacoStyles = () => css`
   {
    animation: none !important; // Removes textarea EUI blue underline animation from EUI
  }
`;

export const codeEditorStyles = () => css`
   {
    position: relative;
    height: 100%;
  }
`;

export const codeEditorPlaceholderContainerStyles = (subduedText: string) => css`
   {
    color: ${subduedText};
    width: max-content;
    pointer-events: none;
  }
`;

export const codeEditorKeyboardHintStyles = (levels: {
  content: Property.ZIndex;
  mask: Property.ZIndex;
  toast: Property.ZIndex;
  modal: Property.ZIndex;
  navigation: Property.ZIndex;
  menu: Property.ZIndex;
  header: Property.ZIndex;
  flyout: Property.ZIndex;
  maskBelowHeader: Property.ZIndex;
}) =>
  css`
     {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      left: 0;

      &:focus {
        z-index: ${levels.mask};
      }

      &--isInactive {
        display: none;
      }
    }
  `;

export const codeEditorControlsStyles = (
  size: {
    base: string;
    xxs: string;
    xs: string;
    s: string;
    m: string;
    l: string;
    xl: string;
    xxl: string;
    xxxl: string;
    xxxxl: string;
  },
  base:
    | string
    | number
    | boolean
    | ComponentSelector
    | SerializedStyles
    | CSSObject
    | ArrayCSSInterpolation
    | null
    | undefined
) => css`
   {
    top: ${size.xs};
    right: ${base};
    position: absolute;
    z-index: 1000;
  }
`;

export const codeEditorFullScreenStyles = () => css`
   {
    position: absolute;
    left: 0;
    top: 0;
  }
`;

export const codeEditorControlsWithinFullScreenStyles = (size: string) => css`
  top: ${size};
  right: ${size};
}`;

// NOTE: For talk around where this theme information will ultimately live,
// please see this discuss issue: https://github.com/elastic/kibana/issues/43814

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
      { token: 'invalid', foreground: euiTheme.euiColorAccent },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },

      { token: 'variable', foreground: euiTheme.euiColorPrimary },
      { token: 'variable.predefined', foreground: euiTheme.euiColorSuccess },
      { token: 'constant', foreground: euiTheme.euiColorAccent },
      { token: 'comment', foreground: euiTheme.euiColorMediumShade },
      { token: 'number', foreground: euiTheme.euiColorAccent },
      { token: 'number.hex', foreground: euiTheme.euiColorAccent },
      { token: 'regexp', foreground: euiTheme.euiColorDanger },
      { token: 'annotation', foreground: euiTheme.euiColorMediumShade },
      { token: 'type', foreground: euiTheme.euiColorVis0 },

      { token: 'delimiter', foreground: euiTheme.euiTextSubduedColor },
      { token: 'delimiter.html', foreground: euiTheme.euiColorDarkShade },
      { token: 'delimiter.xml', foreground: euiTheme.euiColorPrimary },

      { token: 'tag', foreground: euiTheme.euiColorDanger },
      { token: 'tag.id.jade', foreground: euiTheme.euiColorPrimary },
      { token: 'tag.class.jade', foreground: euiTheme.euiColorPrimary },
      { token: 'meta.scss', foreground: euiTheme.euiColorAccent },
      { token: 'metatag', foreground: euiTheme.euiColorSuccess },
      { token: 'metatag.content.html', foreground: euiTheme.euiColorDanger },
      { token: 'metatag.html', foreground: euiTheme.euiColorMediumShade },
      { token: 'metatag.xml', foreground: euiTheme.euiColorMediumShade },
      { token: 'metatag.php', fontStyle: 'bold' },

      { token: 'key', foreground: euiTheme.euiColorWarning },
      { token: 'string.key.json', foreground: euiTheme.euiColorDanger },
      { token: 'string.value.json', foreground: euiTheme.euiColorPrimary },

      { token: 'attribute.name', foreground: euiTheme.euiColorDanger },
      { token: 'attribute.name.css', foreground: euiTheme.euiColorSuccess },
      { token: 'attribute.value', foreground: euiTheme.euiColorPrimary },
      { token: 'attribute.value.number', foreground: euiTheme.euiColorWarning },
      { token: 'attribute.value.unit', foreground: euiTheme.euiColorWarning },
      { token: 'attribute.value.html', foreground: euiTheme.euiColorPrimary },
      { token: 'attribute.value.xml', foreground: euiTheme.euiColorPrimary },

      { token: 'string', foreground: euiTheme.euiColorDanger },
      { token: 'string.html', foreground: euiTheme.euiColorPrimary },
      { token: 'string.sql', foreground: euiTheme.euiColorDanger },
      { token: 'string.yaml', foreground: euiTheme.euiColorPrimary },

      { token: 'keyword', foreground: euiTheme.euiColorPrimary },
      { token: 'keyword.json', foreground: euiTheme.euiColorPrimary },
      { token: 'keyword.flow', foreground: euiTheme.euiColorWarning },
      { token: 'keyword.flow.scss', foreground: euiTheme.euiColorPrimary },
      // Monaco editor supports strikethrough font style only starting from 0.32.0.
      { token: 'keyword.deprecated', foreground: euiTheme.euiColorAccent },

      { token: 'operator.scss', foreground: euiTheme.euiColorDarkShade },
      { token: 'operator.sql', foreground: euiTheme.euiColorMediumShade },
      { token: 'operator.swift', foreground: euiTheme.euiColorMediumShade },
      { token: 'predefined.sql', foreground: euiTheme.euiColorMediumShade },

      { token: 'text', foreground: euiTheme.euiTitleColor },
      { token: 'label', foreground: euiTheme.euiColorVis9 },
    ],
    colors: {
      'editor.foreground': euiTheme.euiColorDarkestShade,
      'editor.background': backgroundColor ?? euiTheme.euiFormBackgroundColor,
      'editorLineNumber.foreground': euiTheme.euiColorDarkShade,
      'editorLineNumber.activeForeground': euiTheme.euiColorDarkShade,
      'editorIndentGuide.background': euiTheme.euiColorLightShade,
      'editor.selectionBackground': selectionBackgroundColor,
      'editorWidget.border': euiTheme.euiColorLightShade,
      'editorWidget.background': euiTheme.euiColorLightestShade,
      'editorCursor.foreground': euiTheme.euiColorDarkestShade,
      'editorSuggestWidget.selectedBackground': euiTheme.euiColorLightShade,
      'list.hoverBackground': euiTheme.euiColorLightShade,
      'list.highlightForeground': euiTheme.euiColorPrimary,
      'editor.lineHighlightBorder': euiTheme.euiColorLightestShade,
    },
  };
}

const DARK_THEME = createTheme(darkTheme, '#343551');
const LIGHT_THEME = createTheme(lightTheme, '#E3E4ED');
const DARK_THEME_TRANSPARENT = createTheme(darkTheme, '#343551', '#00000000');
const LIGHT_THEME_TRANSPARENT = createTheme(lightTheme, '#E3E4ED', '#00000000');

export { DARK_THEME, LIGHT_THEME, DARK_THEME_TRANSPARENT, LIGHT_THEME_TRANSPARENT };
