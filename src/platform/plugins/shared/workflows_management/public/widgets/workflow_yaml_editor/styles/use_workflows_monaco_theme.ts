/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { useEffect } from 'react';

export function useWorkflowsMonacoTheme() {
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    monaco.editor.defineTheme('workflows-subdued', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': euiTheme.colors.backgroundBaseSubdued,
        'editorHoverWidget.foreground': euiTheme.colors.textParagraph,
        'editorHoverWidget.background': euiTheme.colors.backgroundBasePlain,
        'editorHoverWidget.border': euiTheme.colors.borderBasePlain,
      },
    });
  }, [euiTheme]);
}
