/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { useEffect } from 'react';

import { monaco } from '@kbn/monaco';

export function useWorkflowsMonacoTheme() {
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    monaco.editor.defineTheme('workflows-subdued', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'list.hoverForeground': euiTheme.colors.textPrimary,
        'list.hoverBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
        'editor.background': euiTheme.colors.backgroundBaseSubdued,
        'editorSuggestWidget.foreground': euiTheme.colors.textParagraph,
        'editorSuggestWidget.background': euiTheme.colors.backgroundBasePlain,
        'editorSuggestWidget.selectedForeground': euiTheme.colors.textPrimary,
        'editorSuggestWidget.selectedBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
        'editorSuggestWidget.focusHighlightForeground': euiTheme.colors.primary,
        'editorSuggestWidget.border': euiTheme.colors.borderBaseSubdued,
        'editorHoverWidget.foreground': euiTheme.colors.textParagraph,
        'editorHoverWidget.background': euiTheme.colors.backgroundBasePlain,
        'editorHoverWidget.border': euiTheme.colors.borderBaseSubdued,
        'editorLineNumber.foreground': euiTheme.colors.textPrimary,
        'editorLineNumber.activeForeground': euiTheme.colors.textSubdued,
        'editorIndentGuide.background1': euiTheme.colors.backgroundLightText,
        'editorIndentGuide.activeBackground1': euiTheme.colors.borderBaseDisabled,
      },
    });
  }, [euiTheme]);
}
