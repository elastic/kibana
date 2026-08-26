/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type Document,
  isMap,
  isPair,
  isScalar,
  isSeq,
  type Pair,
  parseDocument,
  visit,
} from 'yaml';
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
import {
  getStepNodeAtPosition,
  getStepNodesWithType,
  getStepsAndElseKeyOffsets,
  isStepLikeMap,
} from '../../../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { getMonacoRangeFromYamlNode } from '../utils';

type StepNodeLike = ReturnType<typeof getStepNodesWithType>[number];

function getStepIndentForInsertLine(
  document: Document,
  model: monaco.editor.ITextModel,
  insertLineNumber: number,
  rootStepsKeyLineNumber: number
): number {
  const { stepsKeyStartOffsets, elseKeyStartOffsets } = getStepsAndElseKeyOffsets(document);
  const allKeyOffsets = [...stepsKeyStartOffsets, ...elseKeyStartOffsets];
  let owningKeyLine: number = rootStepsKeyLineNumber;
  for (const keyOffset of allKeyOffsets) {
    const keyLine = model.getPositionAt(keyOffset)?.lineNumber;
    if (keyLine != null && keyLine <= insertLineNumber && keyLine > owningKeyLine) {
      owningKeyLine = keyLine;
    }
  }
  return getIndentLevelFromLineNumber(model, owningKeyLine) + 2;
}

function getStepsAndElseKeyLines(
  document: Document,
  model: monaco.editor.ITextModel
): { stepsKeyLines: Set<number>; elseKeyLines: Set<number> } {
  const { stepsKeyStartOffsets, elseKeyStartOffsets } = getStepsAndElseKeyOffsets(document);
  const toLineSet = (offsets: number[]) =>
    new Set(
      offsets
        .map((off) => model.getPositionAt(off)?.lineNumber)
        .filter((line): line is number => line != null)
    );
  return {
    stepsKeyLines: toLineSet(stepsKeyStartOffsets),
    elseKeyLines: toLineSet(elseKeyStartOffsets),
  };
}

function findStepWithMaxEndOffsetAtOrBefore(
  nodes: StepNodeLike[],
  model: monaco.editor.ITextModel,
  cursorOffset: number
): StepNodeLike | null {
  let best: StepNodeLike | null = null;
  let bestEndOffset = -1;
  for (const node of nodes) {
    const range = getMonacoRangeFromYamlNode(model, node);
    if (range) {
      const endOffset = model.getOffsetAt(
        new monaco.Position(range.endLineNumber, range.endColumn)
      );
      if (endOffset <= cursorOffset && endOffset > bestEndOffset) {
        bestEndOffset = endOffset;
        best = node;
      }
    }
  }
  return best;
}

function getStepsInInnermostBlockContainingCursor(
  document: Document,
  model: monaco.editor.ITextModel,
  cursorOffset: number
): StepNodeLike[] {
  const candidates: Array<{ seq: { items?: unknown[] }; rangeStart: number; rangeEnd: number }> =
    [];
  visit(document, {
    Pair(_key, pair) {
      if (!pair.key || !isScalar(pair.key)) return;
      const keyVal = pair.key.value;
      if (keyVal !== 'steps' && keyVal !== 'else') return;
      const seq = pair.value;
      if (!isSeq(seq) || !seq.range) return;
      const [rangeStart, , rangeEnd] = seq.range as number[];
      if (cursorOffset >= rangeStart && cursorOffset <= rangeEnd) {
        candidates.push({ seq: seq as { items?: unknown[] }, rangeStart, rangeEnd });
      }
    },
  });
  if (candidates.length === 0) return [];
  candidates.sort((a, b) => {
    const spanA = a.rangeEnd - a.rangeStart;
    const spanB = b.rangeEnd - b.rangeStart;
    return spanA - spanB;
  });
  const innermost = candidates[0].seq;
  if (!innermost.items || innermost.items.length === 0) return [];
  const steps: StepNodeLike[] = [];
  for (const item of innermost.items) {
    if (isStepLikeMap(item)) steps.push(item as StepNodeLike);
  }
  return steps;
}

function getLastRootStepEndLine(model: monaco.editor.ITextModel, stepsPair: Pair): number | null {
  const sequence = stepsPair.value;
  if (!isSeq(sequence) || !sequence.items || sequence.items.length === 0) return null;
  const lastItem = sequence.items[sequence.items.length - 1];
  if (!isStepLikeMap(lastItem)) return null;
  const node = lastItem as { range?: number[] };
  if (!node.range) return null;
  const pos = model.getPositionAt(node.range[2]);
  return pos?.lineNumber ?? null;
}

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

function getLastThenStepBeforeElseLine(
  document: Document,
  model: monaco.editor.ITextModel,
  elseKeyLineNumber: number
): StepNodeLike | null {
  let result: StepNodeLike | null = null;
  visit(document, {
    Pair(_key, pair, path) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'else') return;
      const keyNode = pair.key as { range?: number[] };
      if (!keyNode.range) return;
      const line = model.getPositionAt(keyNode.range[0])?.lineNumber;
      if (line !== elseKeyLineNumber) return;
      const pathEnd = path.length >= 1 ? path[path.length - 1] : null;
      const parent =
        pathEnd && isPair(pathEnd) && path.length >= 2 ? path[path.length - 2] : pathEnd;
      if (!parent || !isMap(parent)) return;
      if ((parent as { get?: (k: string) => unknown }).get?.('type') !== 'if') return;
      const stepsSeq = (parent as { get?: (k: string) => unknown }).get?.('steps');
      if (!isSeq(stepsSeq) || !stepsSeq.items?.length) return;
      const lastThen = stepsSeq.items[stepsSeq.items.length - 1];
      if (isMap(lastThen)) result = lastThen as StepNodeLike;
    },
  });
  return result;
}

function findStepNodeToInsertAfter(
  document: Document,
  model: monaco.editor.ITextModel,
  cursorPosition: monaco.Position | null | undefined,
  stepNodes: ReturnType<typeof getStepNodesWithType>,
  stepsKeyRange: monaco.Range | null,
  stepsKeyLines: Set<number>,
  elseKeyLines: Set<number>
) {
  if (cursorPosition && stepsKeyRange) {
    const cursorLine = cursorPosition.lineNumber;
    if (cursorLine < stepsKeyRange.startLineNumber) {
      return null;
    }
    const isOnAnyStepsKeyLine = stepsKeyLines.has(cursorLine);
    const isOnElseKeyLine = elseKeyLines.has(cursorLine);
    const cursorLineContent = model.getLineContent(cursorLine);
    const cursorLineTrimmed = cursorLineContent.trim();
    const isOnCommentLine = cursorLineTrimmed.startsWith('#');
    if (isOnAnyStepsKeyLine || isOnCommentLine) {
      return null;
    }
    if (isOnElseKeyLine) {
      return null;
    }
    if (elseKeyLines.has(cursorLine + 1)) {
      const lastThen = getLastThenStepBeforeElseLine(document, model, cursorLine + 1);
      if (lastThen) return lastThen;
    }

    const stepAtCursor = getStepNodeAtPosition(document, model.getOffsetAt(cursorPosition));
    if (stepAtCursor) {
      if (stepAtCursor.get('type') === 'if') {
        const elsePair = stepAtCursor.items?.find(
          (item): item is Pair => isPair(item) && isScalar(item.key) && item.key.value === 'else'
        );
        const elseKeyRange =
          elsePair?.key && typeof (elsePair.key as { range?: number[] }).range !== 'undefined'
            ? (elsePair.key as { range: number[] }).range
            : null;
        const elseKeyLine =
          elseKeyRange != null ? model.getPositionAt(elseKeyRange[0])?.lineNumber : null;
        if (elseKeyLine != null && cursorLine < elseKeyLine) {
          const stepsSeq = stepAtCursor.get('steps');
          if (isSeq(stepsSeq) && stepsSeq.items && stepsSeq.items.length > 0) {
            const lastThenStep = stepsSeq.items[stepsSeq.items.length - 1];
            if (isMap(lastThenStep)) {
              return lastThenStep;
            }
          }
        }
      }
      const cursorOffset = model.getOffsetAt(cursorPosition);
      const stepsInBlock = getStepsInInnermostBlockContainingCursor(document, model, cursorOffset);
      if (stepsInBlock.length > 0) {
        const stepRangeOfCursor = getMonacoRangeFromYamlNode(model, stepAtCursor);
        const nestedStepsInsideCurrentStep =
          stepRangeOfCursor &&
          stepsInBlock.every((s) => {
            const r = getMonacoRangeFromYamlNode(model, s);
            return (
              r &&
              r.startLineNumber >= stepRangeOfCursor.startLineNumber &&
              r.endLineNumber <= stepRangeOfCursor.endLineNumber
            );
          });
        if (nestedStepsInsideCurrentStep) {
          const bestStep = findStepWithMaxEndOffsetAtOrBefore(stepsInBlock, model, cursorOffset);
          return bestStep ?? stepsInBlock[stepsInBlock.length - 1];
        }
      }
      return stepAtCursor;
    }

    const cursorOffset = model.getOffsetAt(cursorPosition);
    const stepsInBlock = getStepsInInnermostBlockContainingCursor(document, model, cursorOffset);
    const nodesToConsider = stepsInBlock.length > 0 ? stepsInBlock : stepNodes;
    const bestStep = findStepWithMaxEndOffsetAtOrBefore(nodesToConsider, model, cursorOffset);
    if (bestStep) return bestStep;
    if (stepsInBlock.length > 0) return stepsInBlock[stepsInBlock.length - 1];
  }

  return stepNodes.length > 0 ? stepNodes[stepNodes.length - 1] : null;
}

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
    const cursorLineContent = model.getLineContent(cursorLine);
    const cursorLineEmpty = cursorLineContent.trim() === '';
    const stepIndent = getIndentLevelFromLineNumber(model, stepRange.startLineNumber);
    const cursorLineIndent = getIndentLevelFromLineNumber(model, cursorLine);
    const isAfterStep =
      cursorLine > stepRange.endLineNumber ||
      (cursorLine === stepRange.endLineNumber && cursorColumn > stepRange.endColumn);
    if (
      cursorLineEmpty &&
      (cursorLineIndent >= stepIndent || cursorLine >= stepRange.startLineNumber)
    ) {
      insertAtLineNumber = cursorLine;
    } else if (isAfterStep && (cursorLineEmpty || cursorLineIndent >= stepIndent)) {
      insertAtLineNumber = cursorLine;
    }
  }

  return {
    insertAtLineNumber,
    indentLevel: getIndentLevelFromLineNumber(model, stepRange.startLineNumber),
  };
}

function getDefaultInsertPoint(
  document: Document,
  model: monaco.editor.ITextModel,
  stepsPair: Pair,
  stepsKeyRange: monaco.Range,
  expectedIndent: number,
  cursorPosition: monaco.Position | null | undefined,
  stepNodes: ReturnType<typeof getStepNodesWithType>,
  stepsKeyLines: Set<number>,
  elseKeyLines: Set<number>
): {
  insertAtLineNumber: number;
  indentLevel: number;
  insertAfterComment: boolean;
  commentCount?: number;
} {
  const rootLine = stepsKeyRange.startLineNumber;
  const atLine = (lineNum: number) => ({
    insertAtLineNumber: lineNum,
    indentLevel: getStepIndentForInsertLine(document, model, lineNum, rootLine),
    insertAfterComment: false,
  });

  if (cursorPosition) {
    const cursorLine = cursorPosition.lineNumber;
    if (cursorLine >= stepsKeyRange.startLineNumber) {
      const cursorInsertPoint = getInsertPointFromCursor(
        document,
        model,
        cursorPosition,
        stepsKeyRange,
        stepNodes,
        stepsKeyLines,
        elseKeyLines
      );
      if (cursorInsertPoint) return cursorInsertPoint;
      const insertAt = model.getLineContent(cursorLine).trim() === '' ? cursorLine : cursorLine + 1;
      return atLine(insertAt);
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

  const lastRootStepEndLine = getLastRootStepEndLine(model, stepsPair);
  const insertAtLineNumber =
    lastRootStepEndLine != null ? lastRootStepEndLine + 1 : stepsKeyRange.startLineNumber + 1;
  return atLine(insertAtLineNumber);
}

function getInsertPointFromCursor(
  document: Document,
  model: monaco.editor.ITextModel,
  cursorPosition: monaco.Position,
  stepsKeyRange: monaco.Range,
  stepNodes: ReturnType<typeof getStepNodesWithType>,
  stepsKeyLines: Set<number>,
  elseKeyLines: Set<number>
): {
  insertAtLineNumber: number;
  indentLevel: number;
  insertAfterComment: boolean;
  commentCount?: number;
} | null {
  const cursorLine = cursorPosition.lineNumber;
  const rootLine = stepsKeyRange.startLineNumber;
  const at = (insertAtLineNumber: number, insertAfterComment: boolean, commentCount?: number) => ({
    insertAtLineNumber,
    indentLevel: getStepIndentForInsertLine(document, model, insertAtLineNumber, rootLine),
    insertAfterComment,
    ...(commentCount !== undefined && { commentCount }),
  });

  if (cursorLine < stepsKeyRange.startLineNumber) return null;

  const cursorLineContent = model.getLineContent(cursorLine);
  const cursorLineTrimmed = cursorLineContent.trim();
  const isCursorLineEmpty = cursorLineTrimmed === '';
  const isCursorLineComment = cursorLineTrimmed.startsWith('#');
  const isOnAnyStepsKeyLine = stepsKeyLines.has(cursorLine);

  if (isOnAnyStepsKeyLine) return at(cursorLine + 1, false);
  if (elseKeyLines.has(cursorLine)) return at(cursorLine + 1, false);
  if (isCursorLineEmpty) return at(cursorLine, false);
  if (isCursorLineComment) return at(cursorLine, true);

  if (stepNodes.length > 0) {
    const lastStepNode = stepNodes[stepNodes.length - 1];
    const lastStepRange = getMonacoRangeFromYamlNode(model, lastStepNode);
    if (lastStepRange && cursorLine >= lastStepRange.endLineNumber) {
      const cursorLineIndent = getIndentLevelFromLineNumber(model, cursorLine);
      const lastStepIndent = getIndentLevelFromLineNumber(model, lastStepRange.startLineNumber);
      if (isCursorLineEmpty || cursorLineIndent >= lastStepIndent) return at(cursorLine, false);
    }
  }

  return at(cursorLine + 1, false);
}

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
  const { stepsKeyLines, elseKeyLines } = getStepsAndElseKeyLines(document, model);

  const stepNode = findStepNodeToInsertAfter(
    document,
    model,
    cursorPosition,
    stepNodes,
    stepsKeyRange,
    stepsKeyLines,
    elseKeyLines
  );

  const replacement = handleFlowArrayReplacement(model, stepsPair, stepsKeyRange, expectedIndent);
  const { isReplacingFlowArray } = replacement;
  let { replaceRange, indentLevel } = replacement;

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
        document,
        model,
        stepsPair,
        stepsKeyRange,
        expectedIndent,
        cursorPosition,
        stepNodes,
        stepsKeyLines,
        elseKeyLines
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

  if (
    cursorPosition &&
    cursorPosition.lineNumber >= stepsKeyRange.startLineNumber &&
    model.getLineContent(cursorPosition.lineNumber).trim() === ''
  ) {
    insertAtLineNumber = cursorPosition.lineNumber;
    insertAfterComment = true;
  }

  const insertLineForIndent = replaceRange ? replaceRange.startLineNumber : insertAtLineNumber;
  indentLevel = getStepIndentForInsertLine(
    document,
    model,
    insertLineForIndent,
    stepsKeyRange.startLineNumber
  );

  const insertText = prependIndentToLines(snippetText, indentLevel);

  const finalInsertText =
    replaceRange && isReplacingFlowArray && stepsKeyRange
      ? replaceRange.startLineNumber === stepsKeyRange.startLineNumber &&
        replaceRange.endLineNumber === stepsKeyRange.startLineNumber
        ? `steps:\n${insertText}`
        : `\n${insertText}`
      : insertText;

  const cursorOnElseLine =
    cursorPosition !== undefined &&
    cursorPosition !== null &&
    elseKeyLines.has(cursorPosition.lineNumber);

  if (
    !replaceRange &&
    !stepNode &&
    insertAtLineNumber >= 1 &&
    !cursorOnElseLine &&
    cursorPosition
  ) {
    const lineToCheck = insertAfterComment ? insertAtLineNumber + 1 : insertAtLineNumber;
    const atElseKeyLine = elseKeyLines.has(lineToCheck);
    const cursorOffset = model.getOffsetAt(cursorPosition);
    const stepsInBlock = getStepsInInnermostBlockContainingCursor(document, model, cursorOffset);
    const stepStartLines = new Set(
      stepsInBlock
        .map((s) => getMonacoRangeFromYamlNode(model, s)?.startLineNumber)
        .filter((line): line is number => line != null)
    );
    const atFirstStepOfElseBlock =
      lineToCheck > 1 && elseKeyLines.has(lineToCheck - 1) && stepStartLines.has(lineToCheck);
    if (atElseKeyLine || atFirstStepOfElseBlock) {
      insertAtLineNumber = atElseKeyLine ? lineToCheck : lineToCheck - 1;
      insertAfterComment = false;
    }
  }

  const { range, text } = getInsertRangeAndTextForSteps(
    model,
    replaceRange,
    insertAfterComment,
    insertAtLineNumber,
    finalInsertText,
    commentCount,
    isReplacingFlowArray,
    cursorOnElseLine,
    elseKeyLines
  );

  model.pushEditOperations(null, [{ range, text }], () => null);

  if (editor) {
    editor.pushUndoStop();
  }
}
