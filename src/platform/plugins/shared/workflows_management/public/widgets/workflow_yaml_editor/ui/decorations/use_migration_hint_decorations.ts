/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { monaco } from '@kbn/monaco';
import {
  type MigrationHint,
  migrationHints,
} from '../../../../features/validate_workflow_yaml/lib/migration_hints';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';

interface UseMigrationHintDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  isEditorMounted: boolean;
  validationErrors: YamlValidationResult[];
}

export const useMigrationHintDecorations = ({
  editor,
  isEditorMounted,
  validationErrors,
}: UseMigrationHintDecorationsProps) => {
  const decorationCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.clear();
    }

    if (!editor || !isEditorMounted) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }
    console.log('validationErrors', validationErrors);
    const decorations: monaco.editor.IModelDeltaDecoration[] = validationErrors
      .filter((error): error is YamlValidationResult & { message: string } => !!error.message)
      .map((error) => ({
        error,
        hint: migrationHints.find((h: MigrationHint) => h.match({ message: error.message })),
      }))
      .filter((entry): entry is { error: typeof entry.error; hint: MigrationHint } => !!entry.hint)
      .map(({ error, hint }) => ({
        range: new monaco.Range(
          error.startLineNumber,
          1,
          error.startLineNumber,
          model.getLineMaxColumn(error.startLineNumber)
        ),
        options: {
          glyphMarginClassName: hint.glyphClassName,
          glyphMarginHoverMessage: {
            value: hint.hoverMessage,
            isTrusted: true,
            supportHtml: true,
          },
        },
      }));

    if (decorations.length > 0) {
      try {
        decorationCollectionRef.current = editor.createDecorationsCollection(decorations);
      } catch {
        setTimeout(() => {
          if (editor) {
            decorationCollectionRef.current = editor.createDecorationsCollection(decorations);
          }
        }, 10);
      }
    }
  }, [editor, isEditorMounted, validationErrors]);
};
