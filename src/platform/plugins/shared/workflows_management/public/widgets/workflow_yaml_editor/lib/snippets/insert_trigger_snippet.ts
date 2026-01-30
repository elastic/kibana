/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, isNode, parseDocument, type Range } from 'yaml';
import { isMap, isPair, isScalar, isSeq } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { TriggerType } from '@kbn/workflows';
import { generateTriggerSnippet } from './generate_trigger_snippet';
import { getTriggerNodes, getTriggersPair } from '../../../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { getMonacoRangeFromYamlNode, getMonacoRangeFromYamlRange } from '../utils';

/**
 * Gets the triggers key range and calculates the expected indent level for array items
 */
function getTriggersKeyInfo(
  model: monaco.editor.ITextModel,
  triggersPair: ReturnType<typeof getTriggersPair>
): { range: monaco.Range | null; indentLevel: number } {
  if (!triggersPair?.key) {
    return { range: null, indentLevel: 2 };
  }

  const triggersKey = triggersPair.key;
  const triggersKeyRange =
    isNode(triggersKey) && triggersKey.range
      ? getMonacoRangeFromYamlRange(model, triggersKey.range as Range)
      : null;

  const indentLevel = triggersKeyRange
    ? getIndentLevelFromLineNumber(model, triggersKeyRange.startLineNumber) + 2
    : 2;

  return { range: triggersKeyRange, indentLevel };
}

/**
 * Creates a replacement range for an empty item line
 */
function createReplacementRange(model: monaco.editor.ITextModel, lineNumber: number): monaco.Range {
  const nextLineNumber = lineNumber + 1;
  if (nextLineNumber <= model.getLineCount()) {
    return new monaco.Range(lineNumber, 1, nextLineNumber, 1);
  }
  const lineEndColumn = model.getLineMaxColumn(lineNumber);
  return new monaco.Range(lineNumber, 1, lineNumber, lineEndColumn);
}

/**
 * Checks if a YAML node represents an empty item
 * An empty item is one that doesn't have a 'type' field, which is required for triggers
 */
function isEmptyItem(item: unknown): boolean {
  if (!item) {
    return true;
  }

  if (isNode(item) && isScalar(item)) {
    const value = item.value;
    return value === null || value === undefined || value === '';
  }

  if (isNode(item) && isMap(item)) {
    if (!('items' in item) || !item.items || item.items.length === 0) {
      return true;
    }

    const hasTypeField = item.items.some(
      (pairItem) => isPair(pairItem) && isScalar(pairItem.key) && pairItem.key.value === 'type'
    );
    return !hasTypeField;
  }

  return false;
}

/**
 * Finds the last comment line in the triggers section
 */
function findLastCommentLine(
  model: monaco.editor.ITextModel,
  triggersPair: ReturnType<typeof getTriggersPair>,
  triggersKeyRange: monaco.Range | null
): { lineNumber: number; indentLevel: number; commentCount: number } | null {
  if (!triggersKeyRange) {
    return null;
  }

  const startLine = triggersKeyRange.endLineNumber + 1;
  const maxLines = model.getLineCount();
  const triggersIndent = triggersKeyRange.startColumn - 1;
  let lastCommentLine: number | null = null;
  let commentCount = 0;

  for (let lineNum = startLine; lineNum <= maxLines; lineNum++) {
    const lineContent = model.getLineContent(lineNum);
    const trimmed = lineContent.trim();

    const lineIndent = getIndentLevelFromLineNumber(model, lineNum);
    if (trimmed && lineIndent <= triggersIndent) {
      break;
    }

    if (trimmed) {
      if (trimmed.charAt(0) === '#') {
        lastCommentLine = lineNum;
        commentCount++;
      } else {
        return null;
      }
    }
  }

  if (lastCommentLine !== null) {
    const indentLevel = getIndentLevelFromLineNumber(model, lastCommentLine);
    return { lineNumber: lastCommentLine, indentLevel, commentCount };
  }

  return null;
}

/**
 * Determines the insertion range and modifies the insert text based on the insertion context
 */
function getInsertRangeAndText(
  model: monaco.editor.ITextModel,
  replaceRange: monaco.Range | null,
  insertAfterComment: boolean,
  insertAtLineNumber: number,
  insertText: string,
  commentCount?: number,
  isReplacingFlowArray?: boolean
): { range: monaco.Range; text: string } {
  if (replaceRange) {
    // When replacing a flow-style empty array ([]), prepend newline to start on a new line
    const text = isReplacingFlowArray ? `\n${insertText}` : insertText;
    return { range: replaceRange, text };
  }

  if (insertAfterComment) {
    // If there are multiple consecutive comments, insert at a new line after all comments
    if (commentCount && commentCount > 1) {
      const nextLineNumber = insertAtLineNumber + 1;
      if (nextLineNumber <= model.getLineCount()) {
        const nextLineContent = model.getLineContent(nextLineNumber);
        if (nextLineContent.trim() === '') {
          const lineAfterNext = nextLineNumber + 1;
          if (lineAfterNext > model.getLineCount()) {
            const range = new monaco.Range(lineAfterNext, 1, lineAfterNext, 1);
            return { range, text: insertText };
          }
          const lineAfterNextContent = model.getLineContent(lineAfterNext);
          if (lineAfterNextContent.trim() === '') {
            const range = new monaco.Range(lineAfterNext, 1, lineAfterNext, 1);
            return { range, text: insertText };
          }
        }
      }
    }
    // Single comment/trigger or no special handling needed
    const currentLineContent = model.getLineContent(insertAtLineNumber);
    const nextLineNumber = insertAtLineNumber + 1;

    // If the next line exists and is empty, replace it to avoid extra blank lines
    if (nextLineNumber <= model.getLineCount()) {
      const nextLineContent = model.getLineContent(nextLineNumber);
      if (nextLineContent.trim() === '') {
        const lineAfterNext = nextLineNumber + 1;
        if (lineAfterNext <= model.getLineCount()) {
          const range = new monaco.Range(nextLineNumber, 1, lineAfterNext, 1);
          return { range, text: insertText };
        } else {
          const emptyLineEndColumn = model.getLineMaxColumn(nextLineNumber);
          const range = new monaco.Range(nextLineNumber, 1, nextLineNumber, emptyLineEndColumn);
          return { range, text: insertText };
        }
      }
    }

    const lineEndColumn = model.getLineMaxColumn(insertAtLineNumber);
    const range = new monaco.Range(
      insertAtLineNumber,
      lineEndColumn,
      insertAtLineNumber,
      lineEndColumn
    );
    const text = currentLineContent.trim() ? `\n${insertText}` : insertText;
    return { range, text };
  }

  if (insertAtLineNumber > model.getLineCount()) {
    const lastLineNumber = model.getLineCount();
    const lastLineEndColumn = model.getLineMaxColumn(lastLineNumber);
    const range = new monaco.Range(
      lastLineNumber,
      lastLineEndColumn,
      lastLineNumber,
      lastLineEndColumn
    );
    return { range, text: `\n${insertText}` };
  }

  const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1);
  const targetLine = model.getLineContent(insertAtLineNumber);
  if (targetLine.trim()) {
    return { range, text: `${insertText}\n` };
  }

  return { range, text: insertText };
}

/**
 * Finds the first empty item in the triggers sequence
 * Returns null if no empty items are found
 */
function findFirstEmptyItem(
  model: monaco.editor.ITextModel,
  triggersPair: ReturnType<typeof getTriggersPair>
): { lineNumber: number; indentLevel: number } | null {
  if (!triggersPair) {
    return null;
  }

  if (!triggersPair.value || !isSeq(triggersPair.value)) {
    return null;
  }

  const sequence = triggersPair.value;
  if (!sequence.items || sequence.items.length === 0) {
    return null;
  }

  for (const item of sequence.items) {
    if (isEmptyItem(item) && isNode(item) && item.range) {
      const itemRange = getMonacoRangeFromYamlRange(model, item.range as Range);
      if (itemRange) {
        const indentLevel = getIndentLevelFromLineNumber(model, itemRange.startLineNumber);
        return { lineNumber: itemRange.startLineNumber, indentLevel };
      }
    }
  }

  return null;
}

// Algorithm:
// 1. Check if triggers section exists (even if empty or has empty items)
// 2. If triggers section exists, find the next line after the last trigger node range
// 3. If no trigger section found, add triggers: section in the first line of yaml
export function insertTriggerSnippet(
  model: monaco.editor.ITextModel,
  yamlDocument: Document | null,
  triggerType: TriggerType,
  editor?: monaco.editor.IStandaloneCodeEditor
) {
  let document: Document;
  try {
    document = yamlDocument || parseDocument(model.getValue());
  } catch (error) {
    return;
  }

  const triggerNodes = getTriggerNodes(document);
  const triggerNode = triggerNodes.find((node) => node.triggerType === triggerType);
  if (triggerNode) {
    // do not override existing trigger
    return;
  }

  const triggersPair = getTriggersPair(document);
  let insertTriggersSection = true;
  let insertAtLineNumber = 1;
  let indentLevel = 0;
  let triggersKeyRange: monaco.Range | null = null;
  let insertAfterComment = false;
  let replaceRange: monaco.Range | null = null;
  let commentCount: number | undefined;
  let isReplacingFlowArray = false;

  if (triggersPair) {
    insertTriggersSection = false;
    const { range: keyRange, indentLevel: expectedIndent } = getTriggersKeyInfo(
      model,
      triggersPair
    );
    triggersKeyRange = keyRange;

    // Check if triggers is a flow-style empty array (triggers: [])
    if (triggersPair.value && isSeq(triggersPair.value)) {
      const sequence = triggersPair.value;
      if (sequence.flow === true && (!sequence.items || sequence.items.length === 0)) {
        const sequenceRange = getMonacoRangeFromYamlNode(model, sequence);
        if (sequenceRange) {
          replaceRange = sequenceRange;
          indentLevel = expectedIndent;
          isReplacingFlowArray = true;
        }
      }
    }

    if (!replaceRange) {
      const firstEmptyItem = findFirstEmptyItem(model, triggersPair);
      if (firstEmptyItem) {
        replaceRange = createReplacementRange(model, firstEmptyItem.lineNumber);
        indentLevel = firstEmptyItem.indentLevel;
      } else if (triggerNodes.length > 0) {
        const lastTriggerRange = getMonacoRangeFromYamlNode(
          model,
          triggerNodes[triggerNodes.length - 1].node
        );
        if (lastTriggerRange) {
          insertAtLineNumber = lastTriggerRange.endLineNumber;
          indentLevel = getIndentLevelFromLineNumber(model, lastTriggerRange.startLineNumber);
          insertAfterComment = true;
        }
      } else if (triggersKeyRange) {
        const lastCommentLine = findLastCommentLine(model, triggersPair, triggersKeyRange);
        if (lastCommentLine) {
          insertAtLineNumber = lastCommentLine.lineNumber;
          indentLevel = lastCommentLine.indentLevel;
          commentCount = lastCommentLine.commentCount;
          insertAfterComment = true;
        } else {
          insertAtLineNumber = triggersKeyRange.endLineNumber + 1;
          indentLevel = expectedIndent;
        }
      }
    }
  }

  const triggerSnippet = generateTriggerSnippet(triggerType, {
    full: true,
    monacoSuggestionFormat: false,
    withTriggersSection: insertTriggersSection,
  });

  // Create separate undo boundary for each snippet insertion
  if (editor) {
    editor.pushUndoStop();
  }

  const insertText = insertTriggersSection
    ? triggerSnippet
    : prependIndentToLines(triggerSnippet, indentLevel);

  const { range: insertRange, text: finalInsertText } = getInsertRangeAndText(
    model,
    replaceRange,
    insertAfterComment,
    insertAtLineNumber,
    insertText,
    commentCount,
    isReplacingFlowArray
  );

  model.pushEditOperations(
    null,
    [
      {
        range: insertRange,
        text: finalInsertText,
      },
    ],
    () => null
  );

  if (editor) {
    editor.pushUndoStop();
  }
}
