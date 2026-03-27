/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import { getPathAtOffset } from '../../../../../common/lib/yaml';
import {
  type MigrationHint,
  type MigrationHintMatchContext,
  migrationHints,
} from '../../../../features/validate_workflow_yaml/lib/migration_hints';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';

const PANEL_DISMISS_DELAY_MS = 150;

interface UseMigrationHintDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  isEditorMounted: boolean;
  validationErrors: YamlValidationResult[];
  yamlDocument: YAML.Document | null;
}

interface ActiveMigrationHint {
  hint: MigrationHint;
  lineNumber: number;
}

export interface MigrationHintPanelState {
  activeHint: ActiveMigrationHint | null;
  activeHintTop: number | null;
  onPanelMouseEnter: () => void;
  onPanelMouseLeave: () => void;
}

export const useMigrationHintDecorations = ({
  editor,
  isEditorMounted,
  validationErrors,
  yamlDocument,
}: UseMigrationHintDecorationsProps): MigrationHintPanelState => {
  const decorationCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const [activeHint, setActiveHint] = useState<ActiveMigrationHint | null>(null);
  const [activeHintTop, setActiveHintTop] = useState<number | null>(null);
  const isPanelHoveredRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchedHintLinesRef = useRef<Map<number, MigrationHint>>(new Map());

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const scheduleDismiss = useCallback(() => {
    clearDismissTimer();
    dismissTimerRef.current = setTimeout(() => {
      if (!isPanelHoveredRef.current) {
        setActiveHint(null);
        setActiveHintTop(null);
      }
    }, PANEL_DISMISS_DELAY_MS);
  }, [clearDismissTimer]);

  const onPanelMouseEnter = useCallback(() => {
    isPanelHoveredRef.current = true;
    clearDismissTimer();
  }, [clearDismissTimer]);

  const onPanelMouseLeave = useCallback(() => {
    isPanelHoveredRef.current = false;
    scheduleDismiss();
  }, [scheduleDismiss]);

  // Track mouse movement on the editor to detect glyph margin hover
  useEffect(() => {
    if (!editor || !isEditorMounted) {
      return;
    }

    const disposable = editor.onMouseMove((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        const lineNumber = e.target.position.lineNumber;
        const hint = matchedHintLinesRef.current.get(lineNumber);

        if (hint) {
          clearDismissTimer();
          const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
          const top =
            editor.getTopForLineNumber(lineNumber, true) - editor.getScrollTop() + lineHeight;
          setActiveHint({ hint, lineNumber });
          setActiveHintTop(top);
          return;
        }
      }

      if (!isPanelHoveredRef.current) {
        scheduleDismiss();
      }
    });

    return () => disposable.dispose();
  }, [editor, isEditorMounted, clearDismissTimer, scheduleDismiss]);

  // Create glyph decorations (no hover message — the React panel handles that)
  useEffect(() => {
    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.clear();
    }

    const newMatchedLines = new Map<number, MigrationHint>();

    if (!editor || !isEditorMounted) {
      matchedHintLinesRef.current = newMatchedLines;
      return;
    }

    const model = editor.getModel();
    if (!model) {
      matchedHintLinesRef.current = newMatchedLines;
      return;
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = validationErrors
      .filter((error): error is YamlValidationResult & { message: string } => !!error.message)
      .map((error) => {
        let yamlPath: (string | number)[] = [];
        let value: unknown;
        const offset = model.getOffsetAt({
          lineNumber: error.startLineNumber,
          column: error.startColumn,
        });
        if (yamlDocument) {
          try {
            yamlPath = getPathAtOffset(yamlDocument, offset);
            value = yamlDocument.getIn(yamlPath);
          } catch {
            // path resolution can fail for malformed YAML; fall back to empty
          }
        }
        const lineContent = model.getLineContent(error.startLineNumber);
        const keyMatch = lineContent.match(/^\s*([a-zA-Z_][\w]*)\s*:/);
        const propertyName = keyMatch?.[1] ?? null;
        const context: MigrationHintMatchContext = {
          error,
          yamlPath,
          value,
          propertyName,
          yamlDocument,
          offset,
        };
        return {
          error,
          hint: migrationHints.find((h: MigrationHint) => h.match(context)),
        };
      })
      .filter((entry): entry is { error: typeof entry.error; hint: MigrationHint } => !!entry.hint)
      .map(({ error, hint }) => {
        newMatchedLines.set(error.startLineNumber, hint);
        return {
          range: new monaco.Range(
            error.startLineNumber,
            1,
            error.startLineNumber,
            model.getLineMaxColumn(error.startLineNumber)
          ),
          options: {
            glyphMarginClassName: hint.glyphClassName,
          },
        };
      });

    matchedHintLinesRef.current = newMatchedLines;

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

    // Dismiss active hint if the error it was pointing at is gone
    setActiveHint((current) => {
      if (current && !newMatchedLines.has(current.lineNumber)) {
        setActiveHintTop(null);
        return null;
      }
      return current;
    });
  }, [editor, isEditorMounted, validationErrors, yamlDocument]);

  // Cleanup dismiss timer on unmount
  useEffect(() => {
    return () => clearDismissTimer();
  }, [clearDismissTimer]);

  return { activeHint, activeHintTop, onPanelMouseEnter, onPanelMouseLeave };
};
