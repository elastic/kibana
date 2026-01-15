/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, isMap, isPair, isScalar, isSeq, type Pair, parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { isBuiltInStepType } from '@kbn/workflows';
import { generateBuiltInStepSnippet } from './generate_builtin_step_snippet';
import { generateConnectorSnippet } from './generate_connector_snippet';
import {
  createReplacementRange,
  findFirstEmptyItem,
  findLastCommentLine,
  getInsertRangeAndTextForSteps,
  getSectionKeyInfo,
} from './snippet_insertion_utils';
import { getStepNodeAtPosition, getStepNodesWithType } from '../../../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { getMonacoRangeFromYamlNode } from '../utils';

/**
 * Finds the steps pair in the YAML document, even if it's empty or has empty items
 * @returns The steps pair if found, null otherwise
 */
function getStepsPair(yamlDocument: Document): Pair | null {
  if (!yamlDocument?.contents || !isMap(yamlDocument.contents)) {
    return null;
  }

  const contents = yamlDocument.contents;
  if (!('items' in contents) || !contents.items) {
    return null;
  }

  const stepsPair = contents.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'steps'
  );

  return isPair(stepsPair) ? stepsPair : null;
}

/**
 * Finds the step node to insert after based on cursor position or last step
 */
function findStepNodeToInsertAfter(
  document: Document,
  model: monaco.editor.ITextModel,
  cursorPosition: monaco.Position | null | undefined,
  stepNodes: ReturnType<typeof getStepNodesWithType>,
  stepsKeyRange: monaco.Range | null
) {
  if (cursorPosition && stepsKeyRange) {
    const cursorLine = cursorPosition.lineNumber;
    const cursorLineContent = model.getLineContent(cursorLine);
    const cursorLineTrimmed = cursorLineContent.trim();
    const isOnStepsKeyLine = cursorLine === stepsKeyRange.startLineNumber;
    const isOnCommentLine = cursorLineTrimmed.startsWith('#');
    const isOnEmptyLine = cursorLineTrimmed === '';

    if (isOnStepsKeyLine || isOnCommentLine || isOnEmptyLine) {
      return null;
    }

    const stepAtCursor = getStepNodeAtPosition(document, model.getOffsetAt(cursorPosition));
    if (stepAtCursor) {
      return stepAtCursor;
    }
  }

  return stepNodes.length > 0 ? stepNodes[stepNodes.length - 1] : null;
}

/**
 * Handles flow-style empty array replacement (steps: [])
 */
function handleFlowArrayReplacement(
  model: monaco.editor.ITextModel,
  stepsPair: Pair,
  stepsKeyRange: monaco.Range,
  expectedIndent: number
): { replaceRange: monaco.Range | null; indentLevel: number; isReplacingFlowArray: boolean } {
  const sequence = stepsPair.value;
  if (!isSeq(sequence) || sequence.flow !== true || (sequence.items && sequence.items.length > 0)) {
    return { replaceRange: null, indentLevel: 0, isReplacingFlowArray: false };
  }

  const sequenceRange = getMonacoRangeFromYamlNode(model, sequence);
  if (!sequenceRange) {
    return { replaceRange: null, indentLevel: 0, isReplacingFlowArray: false };
  }

  const replaceRange =
    stepsKeyRange.startLineNumber === sequenceRange.startLineNumber
      ? new monaco.Range(
          stepsKeyRange.startLineNumber,
          1,
          stepsKeyRange.startLineNumber,
          model.getLineMaxColumn(stepsKeyRange.startLineNumber)
        )
      : sequenceRange;

  return {
    replaceRange,
    indentLevel: expectedIndent,
    isReplacingFlowArray: true,
  };
}

/**
 * Determines insertion point after a step node
 */
function getInsertPointAfterStep(
  model: monaco.editor.ITextModel,
  stepNode: ReturnType<typeof getStepNodesWithType>[number],
  cursorPosition: monaco.Position | null | undefined
): { insertAtLineNumber: number; indentLevel: number } | null {
  const stepRange = getMonacoRangeFromYamlNode(model, stepNode);
  if (!stepRange) {
    return null;
  }

  let insertAtLineNumber = stepRange.endLineNumber;

  if (cursorPosition) {
    const { lineNumber: cursorLine, column: cursorColumn } = cursorPosition;
    const isAfterStep =
      cursorLine > stepRange.endLineNumber ||
      (cursorLine === stepRange.endLineNumber && cursorColumn > stepRange.endColumn);
    if (isAfterStep && cursorLine <= stepRange.endLineNumber + 10) {
      insertAtLineNumber = cursorLine;
    }
  }

  return {
    insertAtLineNumber,
    indentLevel: getIndentLevelFromLineNumber(model, stepRange.startLineNumber),
  };
}

/**
 * Determines insertion point when no step node is found
 */
function getDefaultInsertPoint(
  model: monaco.editor.ITextModel,
  stepsKeyRange: monaco.Range,
  expectedIndent: number,
  cursorPosition: monaco.Position | null | undefined,
  stepNodes: ReturnType<typeof getStepNodesWithType>
): {
  insertAtLineNumber: number;
  indentLevel: number;
  insertAfterComment: boolean;
  commentCount?: number;
} {
  if (cursorPosition) {
    const cursorLine = cursorPosition.lineNumber;
    if (cursorLine >= stepsKeyRange.startLineNumber) {
      const cursorInsertPoint = getInsertPointFromCursor(
        model,
        cursorPosition,
        stepsKeyRange,
        stepNodes
      );
      if (cursorInsertPoint) {
        return cursorInsertPoint;
      }
      const cursorLineContent = model.getLineContent(cursorLine);
      const cursorLineTrimmed = cursorLineContent.trim();
      const isCursorLineEmpty = cursorLineTrimmed === '';
      const indentLevel = isCursorLineEmpty
        ? getIndentLevelFromLineNumber(model, stepsKeyRange.startLineNumber) + 2
        : getIndentLevelFromLineNumber(model, cursorLine);
      return {
        insertAtLineNumber: isCursorLineEmpty ? cursorLine : cursorLine + 1,
        indentLevel,
        insertAfterComment: false,
      };
    }
  }

  const lastCommentLine = findLastCommentLine(model, stepsKeyRange);
  if (lastCommentLine) {
    return {
      insertAtLineNumber: lastCommentLine.lineNumber,
      indentLevel: lastCommentLine.indentLevel,
      commentCount: lastCommentLine.commentCount,
      insertAfterComment: true,
    };
  }

  return {
    insertAtLineNumber: stepsKeyRange.endLineNumber + 1,
    indentLevel: expectedIndent,
    insertAfterComment: false,
  };
}

/**
 * Determines insertion point based on cursor position when in steps section
 * @returns null if cursor is not in the steps section
 */
function getInsertPointFromCursor(
  model: monaco.editor.ITextModel,
  cursorPosition: monaco.Position,
  stepsKeyRange: monaco.Range,
  stepNodes: ReturnType<typeof getStepNodesWithType>
): {
  insertAtLineNumber: number;
  indentLevel: number;
  insertAfterComment: boolean;
  commentCount?: number;
} | null {
  const cursorLine = cursorPosition.lineNumber;

  if (cursorLine < stepsKeyRange.startLineNumber) {
    return null;
  }

  const cursorLineContent = model.getLineContent(cursorLine);
  const cursorLineTrimmed = cursorLineContent.trim();
  const isCursorLineEmpty = cursorLineTrimmed === '';
  const isCursorLineComment = cursorLineTrimmed.startsWith('#');
  const isOnStepsKeyLine = cursorLine === stepsKeyRange.startLineNumber;

  if (isOnStepsKeyLine) {
    return {
      insertAtLineNumber: stepsKeyRange.endLineNumber + 1,
      indentLevel: getIndentLevelFromLineNumber(model, stepsKeyRange.startLineNumber) + 2,
      insertAfterComment: false,
    };
  }

  if (isCursorLineEmpty) {
    let indentLevel = getIndentLevelFromLineNumber(model, stepsKeyRange.startLineNumber) + 2;
    if (cursorLine > stepsKeyRange.endLineNumber) {
      const prevLineContent = model.getLineContent(cursorLine - 1).trim();
      if (prevLineContent && (prevLineContent.startsWith('-') || prevLineContent.startsWith('#'))) {
        indentLevel = getIndentLevelFromLineNumber(model, cursorLine - 1);
      }
    }
    return {
      insertAtLineNumber: cursorLine,
      indentLevel,
      insertAfterComment: false,
    };
  }

  if (isCursorLineComment) {
    return {
      insertAtLineNumber: cursorLine,
      indentLevel: getIndentLevelFromLineNumber(model, cursorLine),
      insertAfterComment: true,
    };
  }

  if (stepNodes.length > 0) {
    const lastStepNode = stepNodes[stepNodes.length - 1];
    const lastStepRange = getMonacoRangeFromYamlNode(model, lastStepNode);
    if (
      lastStepRange &&
      cursorLine >= lastStepRange.endLineNumber &&
      cursorLine <= lastStepRange.endLineNumber + 10
    ) {
      return {
        insertAtLineNumber: cursorLine,
        indentLevel: getIndentLevelFromLineNumber(model, lastStepRange.startLineNumber),
        insertAfterComment: false,
      };
    }
  }

  const lineIndent = getIndentLevelFromLineNumber(model, cursorLine);
  const indentLevel =
    lineIndent > 0
      ? lineIndent
      : getIndentLevelFromLineNumber(model, stepsKeyRange.startLineNumber) + 2;

  return {
    insertAtLineNumber: cursorLine + 1,
    indentLevel,
    insertAfterComment: false,
  };
}

/**
 * Inserts a step snippet into the YAML editor at the appropriate location.
 */
export function insertStepSnippet(
  model: monaco.editor.ITextModel,
  yamlDocument: Document | null,
  stepType: string,
  cursorPosition?: monaco.Position | null,
  editor?: monaco.editor.IStandaloneCodeEditor
) {
  let document: Document;
  try {
    document = yamlDocument || parseDocument(model.getValue());
  } catch (error) {
    return;
  }

  const stepsPair = getStepsPair(document);
  const stepNodes = getStepNodesWithType(document);

  if (!stepsPair) {
    const lineCount = model.getLineCount();
    const insertText = isBuiltInStepType(stepType)
      ? generateBuiltInStepSnippet(stepType, { full: true, withStepsSection: true })
      : generateConnectorSnippet(stepType, { full: true, withStepsSection: true });

    if (editor) editor.pushUndoStop();

    const insertAtLineNumber = lineCount > 0 ? lineCount + 1 : 1;
    const { range, text } = getInsertRangeAndTextForSteps(
      model,
      null,
      false,
      insertAtLineNumber,
      insertText
    );

    model.pushEditOperations(null, [{ range, text }], () => null);
    if (editor) {
      editor.pushUndoStop();
    }

    return;
  }

  const sectionInfo = getSectionKeyInfo(model, stepsPair);
  if (!sectionInfo.range) {
    return;
  }
  const stepsKeyRange = sectionInfo.range;
  const expectedIndent = sectionInfo.indentLevel;

  const stepNode = findStepNodeToInsertAfter(
    document,
    model,
    cursorPosition,
    stepNodes,
    stepsKeyRange
  );

  let { replaceRange, indentLevel, isReplacingFlowArray } = handleFlowArrayReplacement(
    model,
    stepsPair,
    stepsKeyRange,
    expectedIndent
  );

  if (!replaceRange) {
    const firstEmptyItem = findFirstEmptyItem(model, stepsPair);
    if (firstEmptyItem) {
      replaceRange = createReplacementRange(model, firstEmptyItem.lineNumber);
      indentLevel = firstEmptyItem.indentLevel;
    }
  }

  let insertAtLineNumber = 1;
  let insertAfterComment = false;
  let commentCount: number | undefined;

  if (!replaceRange) {
    if (stepNode) {
      const insertPoint = getInsertPointAfterStep(model, stepNode, cursorPosition);
      if (insertPoint) {
        insertAtLineNumber = insertPoint.insertAtLineNumber;
        indentLevel = insertPoint.indentLevel;
        insertAfterComment = true;
      }
    } else {
      const defaultPoint = getDefaultInsertPoint(
        model,
        stepsKeyRange,
        expectedIndent,
        cursorPosition,
        stepNodes
      );
      insertAtLineNumber = defaultPoint.insertAtLineNumber;
      indentLevel = defaultPoint.indentLevel;
      insertAfterComment = defaultPoint.insertAfterComment;
      commentCount = defaultPoint.commentCount;
    }
  }

  const snippetText = isBuiltInStepType(stepType)
    ? generateBuiltInStepSnippet(stepType, { full: true, withStepsSection: false })
    : generateConnectorSnippet(stepType, { full: true, withStepsSection: false });

  if (editor) editor.pushUndoStop();

  const insertText = prependIndentToLines(snippetText, indentLevel);

  const finalInsertText =
    replaceRange && isReplacingFlowArray && stepsKeyRange
      ? replaceRange.startLineNumber === stepsKeyRange.startLineNumber &&
        replaceRange.endLineNumber === stepsKeyRange.startLineNumber
        ? `steps:\n${insertText}`
        : `\n${insertText}`
      : insertText;

  const { range, text } = getInsertRangeAndTextForSteps(
    model,
    replaceRange,
    insertAfterComment,
    insertAtLineNumber,
    finalInsertText,
    commentCount,
    isReplacingFlowArray
  );

  model.pushEditOperations(null, [{ range, text }], () => null);

  if (editor) {
    editor.pushUndoStop();
  }
}
