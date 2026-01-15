/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isNode, isPair, isScalar, isSeq, type Pair, type Range } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { getMonacoRangeFromYamlRange } from '../utils';

/**
 * Removes trailing newlines from a string without using regex
 */
function removeTrailingNewlines(text: string): string {
  let end = text.length;
  while (end > 0 && text[end - 1] === '\n') {
    end--;
  }
  return text.slice(0, end);
}

/**
 * Gets line content and checks if it's empty
 */
function getLineContent(model: monaco.editor.ITextModel, lineNumber: number): string | null {
  if (lineNumber > model.getLineCount()) {
    return null;
  }
  return model.getLineContent(lineNumber);
}

/**
 * Checks if a line is a comment
 */
function isCommentLine(lineContent: string | null): boolean {
  return lineContent !== null && lineContent.trim().startsWith('#');
}

/**
 * Handles insertion after a comment line
 */
function handleInsertAfterComment(
  model: monaco.editor.ITextModel,
  insertAtLineNumber: number,
  insertText: string,
  addTrailingNewline: boolean
): { range: monaco.Range; text: string } {
  const nextLineNumber = insertAtLineNumber + 1;
  const nextLineContent = getLineContent(model, nextLineNumber);

  if (nextLineContent === null) {
    const lineEndColumn = model.getLineMaxColumn(insertAtLineNumber);
    const range = new monaco.Range(
      insertAtLineNumber,
      lineEndColumn,
      insertAtLineNumber,
      lineEndColumn
    );
    return { range, text: `\n${insertText}` };
  }

  if (nextLineContent.trim() === '') {
    const lineAfterNext = nextLineNumber + 1;
    const lineAfterNextContent = getLineContent(model, lineAfterNext);
    if (lineAfterNextContent === null || lineAfterNextContent.trim() === '') {
      const emptyLineEndColumn = model.getLineMaxColumn(nextLineNumber);
      const range = new monaco.Range(nextLineNumber, 1, nextLineNumber, emptyLineEndColumn);
      return { range, text: insertText };
    }
    const range = new monaco.Range(nextLineNumber, 1, lineAfterNext, 1);
    return { range, text: insertText };
  }

  const normalizedText = removeTrailingNewlines(insertText);
  const range = new monaco.Range(nextLineNumber, 1, nextLineNumber, 1);
  return { range, text: addTrailingNewline ? `${normalizedText}\n` : normalizedText };
}

/**
 * Handles insertion after a non-comment item (step/trigger)
 */
function handleInsertAfterItem(
  model: monaco.editor.ITextModel,
  insertAtLineNumber: number,
  insertText: string,
  addTrailingNewline: boolean
): { range: monaco.Range; text: string } {
  const nextLineNumber = insertAtLineNumber + 1;
  const range = new monaco.Range(nextLineNumber, 1, nextLineNumber, 1);
  const nextLineContent = getLineContent(model, nextLineNumber);

  if (nextLineContent && nextLineContent.trim()) {
    const normalizedText = removeTrailingNewlines(insertText);
    return { range, text: addTrailingNewline ? `${normalizedText}\n` : normalizedText };
  }

  return { range, text: insertText };
}

/**
 * Creates a replacement range for an empty item line
 */
export function createReplacementRange(
  model: monaco.editor.ITextModel,
  lineNumber: number
): monaco.Range {
  const nextLineNumber = lineNumber + 1;
  if (nextLineNumber <= model.getLineCount()) {
    return new monaco.Range(lineNumber, 1, nextLineNumber, 1);
  }
  const lineEndColumn = model.getLineMaxColumn(lineNumber);
  return new monaco.Range(lineNumber, 1, lineNumber, lineEndColumn);
}

/**
 * Checks if a YAML node represents an empty item
 * An empty item is one that doesn't have a 'type' field, which is required for triggers/steps
 */
export function isEmptyItem(item: unknown): boolean {
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
 * Finds the last comment line in a section (triggers or steps)
 */
export function findLastCommentLine(
  model: monaco.editor.ITextModel,
  sectionKeyRange: monaco.Range | null
): { lineNumber: number; indentLevel: number; commentCount: number } | null {
  if (!sectionKeyRange) {
    return null;
  }

  const startLine = sectionKeyRange.endLineNumber + 1;
  const maxLines = model.getLineCount();
  const sectionIndent = sectionKeyRange.startColumn - 1;
  let lastCommentLine: number | null = null;
  let commentCount = 0;

  for (let lineNum = startLine; lineNum <= maxLines; lineNum++) {
    const lineContent = getLineContent(model, lineNum);
    if (!lineContent) break;

    const trimmed = lineContent.trim();
    if (trimmed) {
      const lineIndent = getIndentLevelFromLineNumber(model, lineNum);
      if (lineIndent <= sectionIndent) {
        break;
      }

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
export function getInsertRangeAndTextForTriggers(
  model: monaco.editor.ITextModel,
  replaceRange: monaco.Range | null,
  insertAfterComment: boolean,
  insertAtLineNumber: number,
  insertText: string,
  commentCount?: number,
  isReplacingFlowArray?: boolean
): { range: monaco.Range; text: string } {
  if (replaceRange) {
    const text = isReplacingFlowArray ? `\n${insertText}` : insertText;
    return { range: replaceRange, text };
  }

  if (insertAfterComment) {
    if (insertAtLineNumber >= model.getLineCount()) {
      const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1);
      return { range, text: insertText };
    }

    const currentLineContent = getLineContent(model, insertAtLineNumber);
    if (isCommentLine(currentLineContent)) {
      if (commentCount && commentCount > 1) {
        const nextLineNumber = insertAtLineNumber + 1;
        const nextLineContent = getLineContent(model, nextLineNumber);
        if (nextLineContent !== null && nextLineContent.trim() === '') {
          const lineAfterNext = nextLineNumber + 1;
          const lineAfterNextContent = getLineContent(model, lineAfterNext);
          if (lineAfterNextContent === null) {
            const range = new monaco.Range(lineAfterNext, 1, lineAfterNext, 1);
            return { range, text: insertText };
          }
          if (lineAfterNextContent.trim() === '') {
            const range = new monaco.Range(lineAfterNext, 1, lineAfterNext, 1);
            return { range, text: insertText };
          }
        }
      }
      return handleInsertAfterComment(model, insertAtLineNumber, insertText, false);
    } else {
      return handleInsertAfterItem(model, insertAtLineNumber, insertText, false);
    }
  }

  if (insertAtLineNumber > model.getLineCount()) {
    if (insertAtLineNumber === model.getLineCount() + 1) {
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
    return { range, text: insertText };
  }

  const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1);
  const targetLine = getLineContent(model, insertAtLineNumber);
  if (targetLine && targetLine.trim()) {
    return { range, text: `${insertText}\n` };
  }

  return { range, text: insertText };
}

export function getInsertRangeAndTextForSteps(
  model: monaco.editor.ITextModel,
  replaceRange: monaco.Range | null,
  insertAfterComment: boolean,
  insertAtLineNumber: number,
  insertText: string,
  commentCount?: number,
  isReplacingFlowArray?: boolean
): { range: monaco.Range; text: string } {
  if (replaceRange) {
    const text =
      isReplacingFlowArray && !insertText.startsWith('steps:\n') ? `\n${insertText}` : insertText;
    return { range: replaceRange, text };
  }

  if (insertAfterComment) {
    if (insertAtLineNumber > model.getLineCount()) {
      const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1);
      return { range, text: insertText };
    }

    const currentLineContent = getLineContent(model, insertAtLineNumber);
    if (isCommentLine(currentLineContent)) {
      return handleInsertAfterComment(model, insertAtLineNumber, insertText, true);
    } else {
      return handleInsertAfterItem(model, insertAtLineNumber, insertText, true);
    }
  }

  if (insertAtLineNumber > model.getLineCount()) {
    const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1);
    return { range, text: insertText };
  }

  const targetLine = getLineContent(model, insertAtLineNumber);

  if (targetLine && targetLine.trim()) {
    const normalizedText = removeTrailingNewlines(insertText);
    const isComment = targetLine.trim().startsWith('#');
    if (isComment) {
      const lineEndColumn = model.getLineMaxColumn(insertAtLineNumber);
      const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, lineEndColumn);
      return { range, text: `${normalizedText}\n${targetLine}\n` };
    }
    const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1);
    return { range, text: `${normalizedText}\n` };
  }

  const lineEndColumn = model.getLineMaxColumn(insertAtLineNumber);
  const range = new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, lineEndColumn);
  return { range, text: insertText };
}

/**
 * Finds the first empty item in a sequence (triggers or steps)
 */
export function findFirstEmptyItem(
  model: monaco.editor.ITextModel,
  sectionPair: Pair | null
): { lineNumber: number; indentLevel: number } | null {
  if (!sectionPair) {
    return null;
  }

  if (!sectionPair.value || !isSeq(sectionPair.value)) {
    return null;
  }

  const sequence = sectionPair.value;
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

/**
 * Gets the section key range and calculates the expected indent level for array items
 * Works for both triggers and steps sections
 */
export function getSectionKeyInfo(
  model: monaco.editor.ITextModel,
  sectionPair: Pair | null
): { range: monaco.Range | null; indentLevel: number } {
  if (!sectionPair?.key) {
    return { range: null, indentLevel: 2 };
  }

  const sectionKey = sectionPair.key;
  const sectionKeyRange =
    isNode(sectionKey) && sectionKey.range
      ? getMonacoRangeFromYamlRange(model, sectionKey.range as Range)
      : null;

  const indentLevel = sectionKeyRange
    ? getIndentLevelFromLineNumber(model, sectionKeyRange.startLineNumber) + 2
    : 2;

  return { range: sectionKeyRange, indentLevel };
}
