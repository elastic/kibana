/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import type { monaco } from '@kbn/monaco';
import { css } from '@emotion/react';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import { useEuiTheme } from '@elastic/eui';
import type { DataErrorsControl } from './types';
import { filterDataErrors } from './helpers';

export function useQueryStatusDecorations({
  editor,
  errors,
  warnings,
  dataErrorsControl,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | undefined;
  errors: MonacoMessage[];
  warnings: MonacoMessage[];
  dataErrorsControl?: DataErrorsControl;
}) {
  const theme = useEuiTheme();
  const decorationsCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection>();
  const queryStatusDecorationsStyles = css`
    .esql-error-glyph {
      background: ${theme.euiTheme.colors.danger};
      width: ${theme.euiTheme.size.xs} !important;
      margin-left: ${theme.euiTheme.size.xs};
    }

    .esql-warning-glyph {
      background: ${theme.euiTheme.colors.warning};
      width: ${theme.euiTheme.size.xs} !important;
      margin-left: ${theme.euiTheme.size.xs};
    }
  `;

  const visibleErrors = useMemo(() => {
    if (dataErrorsControl?.enabled === false) {
      return filterDataErrors(errors);
    }
    return errors;
  }, [errors, dataErrorsControl]);

  const updateDecorations = useCallback(() => {
    if (!editor || !editor.getModel()) {
      return;
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Errors
    visibleErrors.forEach((error) => {
      decorations.push({
        range: {
          startLineNumber: error.startLineNumber || 1,
          startColumn: error.startColumn || 1,
          endLineNumber: error.endLineNumber || error.startLineNumber || 1,
          endColumn: error.endColumn || error.startColumn || 1,
        },
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'esql-error-glyph',
        },
      });
    });

    // Warnings
    warnings.forEach((warning) => {
      decorations.push({
        range: {
          startLineNumber: warning.startLineNumber || 1,
          startColumn: warning.startColumn || 1,
          endLineNumber: warning.endLineNumber || warning.startLineNumber || 1,
          endColumn: warning.endColumn || warning.startColumn || 1,
        },
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'esql-warning-glyph',
          glyphMarginHoverMessage: {
            value: warning.message,
            isTrusted: true,
          },
        },
      });
    });

    if (decorationsCollectionRef.current) {
      decorationsCollectionRef.current.clear();
    }
    if (decorations.length > 0) {
      decorationsCollectionRef.current = editor.createDecorationsCollection(decorations);
    }
  }, [editor, visibleErrors, warnings]);

  useEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  const cleanupQueryStatusDecorations = useCallback(() => {
    if (decorationsCollectionRef.current) {
      decorationsCollectionRef.current.clear();
      decorationsCollectionRef.current = undefined;
    }
  }, []);

  return {
    cleanupQueryStatusDecorations,
    queryStatusDecorationsStyles,
  };
}
