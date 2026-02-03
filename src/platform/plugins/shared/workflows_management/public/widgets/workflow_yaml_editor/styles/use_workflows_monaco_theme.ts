/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import chroma from 'chroma-js';
import { useEffect } from 'react';
import { CODE_EDITOR_DEFAULT_THEME_ID, defaultThemesResolvers, monaco } from '@kbn/monaco';

export const WORKFLOWS_MONACO_EDITOR_THEME = 'workflows-theme';

export function useWorkflowsMonacoTheme() {
  const { euiTheme, colorMode, ...rest } = useEuiTheme();
  const themeBase = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID]({
    colorMode,
    euiTheme,
    ...rest,
  });
  useEffect(() => {
    monaco.editor.defineTheme(WORKFLOWS_MONACO_EDITOR_THEME, {
      ...themeBase,
      colors: {
        ...themeBase.colors,
        'list.hoverForeground': euiTheme.colors.textPrimary,
        'list.hoverBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
        'editorSuggestWidget.foreground': euiTheme.colors.textParagraph,
        'editorSuggestWidget.background': euiTheme.colors.backgroundBasePlain,
        'editorSuggestWidget.selectedForeground': euiTheme.colors.textPrimary,
        'editorSuggestWidget.selectedBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
        'editorSuggestWidget.focusHighlightForeground': euiTheme.colors.primary,
        'editorSuggestWidget.border': euiTheme.colors.borderBaseSubdued,
        'editorHoverWidget.foreground': euiTheme.colors.textParagraph,
        'editorHoverWidget.background': euiTheme.colors.backgroundBasePlain,
        'editorHoverWidget.border': euiTheme.colors.borderBaseSubdued,
        // Subtle highlight for hover - 0.15 alpha means 15% opacity
        'editor.hoverHighlightBackground': chroma(
          transparentize(euiTheme.colors.primary, 0.15)
        ).hex(),
        'editorLineNumber.foreground': euiTheme.colors.textPrimary,
        'editorLineNumber.activeForeground': euiTheme.colors.textSubdued,
        'editorIndentGuide.background1': euiTheme.colors.backgroundLightText,
        'editorIndentGuide.activeBackground1': euiTheme.colors.borderBaseDisabled,
        // Transparent backgrounds, they are set by the styles of the editor container behind.
        'editor.background': '#00000000',
        'editorGutter.background': '#00000000',
        'minimap.background': '#00000000',
      },
    });
  }, [themeBase, euiTheme]);
}
