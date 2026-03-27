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

interface ActiveMigrationHints {
  hints: MigrationHint[];
  lineNumber: number;
}

export interface MigrationHintPanelState {
  activeHints: ActiveMigrationHints | null;
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
  const [activeHints, setActiveHints] = useState<ActiveMigrationHints | null>(null);
  const [activeHintTop, setActiveHintTop] = useState<number | null>(null);
  const isPanelHoveredRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchedHintLinesRef = useRef<Map<number, MigrationHint[]>>(new Map());

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
        setActiveHints(null);
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
        const hints = matchedHintLinesRef.current.get(lineNumber);

        if (hints && hints.length > 0) {
          clearDismissTimer();
          const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
          const top =
            editor.getTopForLineNumber(lineNumber, true) - editor.getScrollTop() + lineHeight;
          setActiveHints({ hints, lineNumber });
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

  // Update panel position on scroll
  useEffect(() => {
    if (!editor || !isEditorMounted) {
      return;
    }

    const disposable = editor.onDidScrollChange(() => {
      setActiveHints((current) => {
        if (!current) return null;
        const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
        const top =
          editor.getTopForLineNumber(current.lineNumber, true) - editor.getScrollTop() + lineHeight;
        setActiveHintTop(top);
        return current;
      });
    });

    return () => disposable.dispose();
  }, [editor, isEditorMounted]);

  // Create glyph decorations (no hover message — the React panel handles that)
  useEffect(() => {
    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.clear();
    }

    const newMatchedLines = new Map<number, MigrationHint[]>();

    if (!editor || !isEditorMounted) {
      matchedHintLinesRef.current = newMatchedLines;
      return;
    }

    const model = editor.getModel();
    if (!model) {
      matchedHintLinesRef.current = newMatchedLines;
      return;
    }

    validationErrors
      .filter((error): error is YamlValidationResult & { message: string } => !!error.message)
      .forEach((error) => {
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

        const matched = Object.values(migrationHints).filter((h: MigrationHint) =>
          h.match(context)
        );
        if (matched.length === 0) return;

        const existing = newMatchedLines.get(error.startLineNumber) ?? [];
        for (const hint of matched) {
          if (!existing.some((h) => h.id === hint.id)) {
            existing.push(hint);
          }
        }
        newMatchedLines.set(error.startLineNumber, existing);
      });

    matchedHintLinesRef.current = newMatchedLines;

    const decorations: monaco.editor.IModelDeltaDecoration[] = Array.from(
      newMatchedLines.keys()
    ).map((lineNumber) => ({
      range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
      options: {
        glyphMarginClassName: 'migration-hint-glyph',
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

    setActiveHints((current) => {
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

  return { activeHints, activeHintTop, onPanelMouseEnter, onPanelMouseLeave };
};
