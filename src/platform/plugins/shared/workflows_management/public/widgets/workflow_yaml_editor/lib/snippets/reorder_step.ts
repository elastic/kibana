/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, isScalar, isSeq, visit, type YAMLMap, type YAMLSeq } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getStepNode, isStepLikeMap } from '@kbn/workflows-yaml';
import type { InsertedLineRange } from './get_line_range_for_edit';
import { getMonacoRangeFromYamlNode } from '../utils';

export type StepMoveDirection = 'up' | 'down';

export interface StepMoveState {
  canMoveUp: boolean;
  canMoveDown: boolean;
  index: number;
  siblings: YAMLMap[];
}

function findParentStepSeq(document: Document, stepNode: YAMLMap): YAMLSeq | null {
  let result: YAMLSeq | null = null;
  visit(document, {
    Pair(_key, pair) {
      if (!pair.key || !isScalar(pair.key)) {
        return;
      }
      if (pair.key.value !== 'steps' && pair.key.value !== 'else') {
        return;
      }
      const seq = pair.value;
      if (!isSeq(seq) || !seq.items) {
        return;
      }
      if (seq.items.includes(stepNode)) {
        result = seq;
        return visit.BREAK;
      }
    },
  });
  return result;
}

function getSiblingSteps(seq: YAMLSeq): YAMLMap[] {
  if (!seq.items) {
    return [];
  }
  return seq.items.filter(isStepLikeMap);
}

/**
 * Whether the named step can move up/down within its parent `steps` / `else` array.
 */
export function getStepMoveState(
  document: Document | null | undefined,
  stepId: string
): StepMoveState {
  const empty: StepMoveState = {
    canMoveUp: false,
    canMoveDown: false,
    index: -1,
    siblings: [],
  };
  if (!document) {
    return empty;
  }

  const stepNode = getStepNode(document, stepId);
  if (!stepNode) {
    return empty;
  }

  const parentSeq = findParentStepSeq(document, stepNode);
  if (!parentSeq) {
    return empty;
  }

  const siblings = getSiblingSteps(parentSeq);
  const index = siblings.indexOf(stepNode);
  if (index < 0) {
    return empty;
  }

  return {
    canMoveUp: index > 0,
    canMoveDown: index < siblings.length - 1,
    index,
    siblings,
  };
}

function getStepBlockLineRange(
  model: monaco.editor.ITextModel,
  stepNode: YAMLMap
): { startLine: number; endLine: number } | null {
  const range = getMonacoRangeFromYamlNode(model, stepNode);
  if (!range) {
    return null;
  }
  // YAML map ranges often end at column 1 of the following line (after a trailing \n).
  let endLine = range.endLineNumber;
  if (range.endColumn === 1 && endLine > range.startLineNumber) {
    endLine -= 1;
  }
  return {
    startLine: range.startLineNumber,
    endLine,
  };
}

function getLineBlockText(
  model: monaco.editor.ITextModel,
  startLine: number,
  endLine: number
): string {
  const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
  const start = model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn });
  const end = model.getOffsetAt({ lineNumber: range.endLineNumber, column: range.endColumn });
  return model.getValue().slice(start, end);
}

/**
 * Swap the step with its adjacent sibling in the YAML `steps` / `else` sequence.
 * Preserves formatting between the two blocks. Returns the new line range of the moved step.
 */
export function reorderStep(
  model: monaco.editor.ITextModel,
  document: Document | null | undefined,
  stepId: string,
  direction: StepMoveDirection,
  editor?: monaco.editor.IStandaloneCodeEditor
): InsertedLineRange | undefined {
  if (!document) {
    return undefined;
  }

  const moveState = getStepMoveState(document, stepId);
  const { index, siblings, canMoveUp, canMoveDown } = moveState;
  if (index < 0) {
    return undefined;
  }
  if (direction === 'up' && !canMoveUp) {
    return undefined;
  }
  if (direction === 'down' && !canMoveDown) {
    return undefined;
  }

  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  const currentNode = siblings[index];
  const neighborNode = siblings[neighborIndex];

  const currentBlock = getStepBlockLineRange(model, currentNode);
  const neighborBlock = getStepBlockLineRange(model, neighborNode);
  if (!currentBlock || !neighborBlock) {
    return undefined;
  }

  const upper = direction === 'up' ? neighborBlock : currentBlock;
  const lower = direction === 'up' ? currentBlock : neighborBlock;

  const upperText = getLineBlockText(model, upper.startLine, upper.endLine);
  const lowerText = getLineBlockText(model, lower.startLine, lower.endLine);

  const afterUpperOffset = model.getOffsetAt({
    lineNumber: upper.endLine,
    column: model.getLineMaxColumn(upper.endLine),
  });
  const beforeLowerOffset = model.getOffsetAt({
    lineNumber: lower.startLine,
    column: 1,
  });
  const separator = model.getValue().slice(afterUpperOffset, beforeLowerOffset);

  const combinedRange = new monaco.Range(
    upper.startLine,
    1,
    lower.endLine,
    model.getLineMaxColumn(lower.endLine)
  );
  const newText = `${lowerText}${separator}${upperText}`;

  if (editor) {
    editor.pushUndoStop();
  }
  model.pushEditOperations(null, [{ range: combinedRange, text: newText }], () => null);
  if (editor) {
    editor.pushUndoStop();
  }

  // After swap, the moved step occupies the former upper start when moving up.
  // When moving down, it starts immediately after the neighbor block we placed first.
  if (direction === 'up') {
    const lineCount = lowerText.split('\n').length;
    return {
      lineStart: upper.startLine,
      lineEnd: upper.startLine + lineCount - 1,
    };
  }

  const neighborLineCount = lowerText.split('\n').length;
  const movedLineCount = upperText.split('\n').length;
  const lineStart = upper.startLine + neighborLineCount;
  return {
    lineStart,
    lineEnd: lineStart + movedLineCount - 1,
  };
}
