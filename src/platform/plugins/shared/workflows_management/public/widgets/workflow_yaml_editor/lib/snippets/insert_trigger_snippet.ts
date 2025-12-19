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
 * Checks if a line content represents an empty item
 * An empty item is one that:
 * - Has only trailing spaces after the dash or only the dash
 * - Is null, undefined, or empty scalar
 * - Is an empty map (no items or no 'type' field)
 * - Has only comments (no actual content)
 */
function isLineContentEmpty(lineContent: string): boolean {
  const trimmed = lineContent.trim();
  
  if (!trimmed) {
    return true;
  }
  
  const dashOnlyPattern = /^\s*-\s*(#.*)?$/;
  if (dashOnlyPattern.test(trimmed)) {
    return true;
  }
  
  if (trimmed.startsWith('#')) {
    return true;
  }
  
  return false;
}

/**
 * Checks if a YAML node represents an empty item
 * An empty item is one that doesn't have a 'type' field, which is required for triggers
 * This function checks the YAML structure, while isLineContentEmpty checks the raw line content
 */
function isEmptyItem(item: unknown, model?: monaco.editor.ITextModel): boolean {
  if (!item) {
    return true;
  }
  
  if (model && isNode(item) && item.range) {
    const itemRange = getMonacoRangeFromYamlRange(model, item.range as Range);
    if (itemRange) {
      const lineContent = model.getLineContent(itemRange.startLineNumber);
      if (isLineContentEmpty(lineContent)) {
        return true;
      }
    }
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
  
  if (isNode(item) && isScalar(item)) {
    const value = item.value;
    return value === null || value === undefined || value === '';
  }
  
  return false;
}

/**
 * Finds the first empty item in the triggers sequence
 * This handles all cases: empty dashes, trailing spaces, comments, etc.
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
    if (isEmptyItem(item, model)) {
      if (isNode(item) && item.range) {
        const itemRange = getMonacoRangeFromYamlRange(model, item.range as Range);
        if (itemRange) {
          const lineContent = model.getLineContent(itemRange.startLineNumber);
          
          if (isLineContentEmpty(lineContent)) {
            const indentMatch = lineContent.match(/^(\s*)/);
            const indentLevel = indentMatch ? indentMatch[1].length : 2;
            return { lineNumber: itemRange.startLineNumber, indentLevel };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Gets the line number after the last non-empty line in the triggers section
 * This handles cases where triggers section exists but is empty or has only comments
 */
function getInsertLineAfterTriggersKey(
  model: monaco.editor.ITextModel,
  triggersKeyRange: monaco.Range,
  expectedIndent: number
): number {
  let lineNumber = triggersKeyRange.endLineNumber;
  const maxLines = model.getLineCount();
  let lastCommentOrEmptyLine = lineNumber;
  const triggersIndent = triggersKeyRange.startColumn - 1;

  while (lineNumber < maxLines) {
    lineNumber++;
    const lineContent = model.getLineContent(lineNumber);
    const trimmed = lineContent.trim();
    const indentMatch = lineContent.match(/^(\s*)/);
    const lineIndent = indentMatch ? indentMatch[1].length : 0;

    if (trimmed && lineIndent <= triggersIndent) {
      return lineNumber;
    }

    if (trimmed && !trimmed.startsWith('#')) {
      return lineNumber;
    }

    if (!trimmed || trimmed.startsWith('#')) {
      if (lineIndent > triggersIndent || !trimmed) {
        lastCommentOrEmptyLine = lineNumber;
      } else {
        break;
      }
    }
  }

  return lastCommentOrEmptyLine + 1;
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
    // If YAML is malformed, we can't insert the trigger snippet
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
  let replaceRange: monaco.Range | null = null;
  let indentLevel = 0;

  if (triggersPair) {
    insertTriggersSection = false;
    const { range: triggersKeyRange, indentLevel: expectedIndent } = getTriggersKeyInfo(
      model,
      triggersPair
    );

    // First, check if there are any empty items to replace
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
      }
    } else if (triggersKeyRange) {
       // Triggers section exists but is completely empty, insert after triggers:
      insertAtLineNumber = getInsertLineAfterTriggersKey(model, triggersKeyRange, expectedIndent);
      indentLevel = expectedIndent;
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

  model.pushEditOperations(
    null,
    [
      {
        range: replaceRange || new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1),
        text: insertTriggersSection
          ? triggerSnippet
          : prependIndentToLines(triggerSnippet, indentLevel),
      },
    ],
    () => null
  );

  if (editor) {
    editor.pushUndoStop();
  }
}
