/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Document, parseDocument } from 'yaml';
import type { monaco } from '@kbn/code-editor';
import type { StepInfo } from '../../../../entities/workflows/store';
import {
  getStepMoveState,
  reorderStep,
  type StepMoveDirection,
} from '../../lib/snippets/reorder_step';
import type { StepLineRange } from '../decorations';

interface UseStepReorderParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  focusedStepInfo: StepInfo | undefined;
  isReadOnly: boolean;
  yamlDocument: Document | null | undefined;
}

interface UseStepReorderResult {
  canMoveUp: boolean;
  canMoveDown: boolean;
  insertedStepRange: StepLineRange | null;
  highlightStepRange: (range: StepLineRange) => void;
  moveStepUp: () => void;
  moveStepDown: () => void;
}

/** Manages step reorder commands and the temporary moved-step highlight. */
export const useStepReorder = ({
  editorRef,
  focusedStepInfo,
  isReadOnly,
  yamlDocument,
}: UseStepReorderParams): UseStepReorderResult => {
  const focusedStepInfoRef = useRef(focusedStepInfo);
  focusedStepInfoRef.current = focusedStepInfo;
  const isReadOnlyRef = useRef(isReadOnly);
  isReadOnlyRef.current = isReadOnly;
  const [insertedStepRange, setInsertedStepRange] = useState<StepLineRange | null>(null);

  const moveFocusedStep = useCallback(
    (direction: StepMoveDirection) => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      const stepInfo = focusedStepInfoRef.current;
      if (!editor || !model || !stepInfo || isReadOnlyRef.current) {
        return;
      }

      const currentDocument = parseDocument(model.getValue());
      if (currentDocument.errors.length > 0) {
        return;
      }

      const result = reorderStep(model, currentDocument, stepInfo.stepId, direction, editor);
      if (!result) {
        return;
      }

      setInsertedStepRange(result);
      editor.setPosition({ lineNumber: result.lineStart, column: 1 });
      editor.revealLineInCenter(result.lineStart);
      editor.focus();
    },
    [editorRef]
  );

  const moveStepUp = useCallback(() => moveFocusedStep('up'), [moveFocusedStep]);
  const moveStepDown = useCallback(() => moveFocusedStep('down'), [moveFocusedStep]);
  const highlightStepRange = useCallback((range: StepLineRange) => setInsertedStepRange(range), []);

  const { canMoveUp, canMoveDown } = useMemo(
    () =>
      focusedStepInfo
        ? getStepMoveState(yamlDocument, focusedStepInfo.stepId)
        : { canMoveUp: false, canMoveDown: false },
    [focusedStepInfo, yamlDocument]
  );

  useEffect(() => {
    if (!insertedStepRange) {
      return;
    }
    const timeoutId = window.setTimeout(() => setInsertedStepRange(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [insertedStepRange]);

  return {
    canMoveUp,
    canMoveDown,
    insertedStepRange,
    highlightStepRange,
    moveStepUp,
    moveStepDown,
  };
};
