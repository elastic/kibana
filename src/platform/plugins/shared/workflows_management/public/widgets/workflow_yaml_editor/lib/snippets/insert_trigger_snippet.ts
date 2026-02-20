/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, isSeq, parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { generateTriggerSnippet } from './generate_trigger_snippet';
import {
  createReplacementRange,
  findFirstEmptyItem,
  findLastCommentLine,
  getInsertRangeAndTextForTriggers,
  getSectionKeyInfo,
} from './snippet_insertion_utils';
import { getTriggerNodes, getTriggersPair } from '../../../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { getMonacoRangeFromYamlNode } from '../utils';

// Algorithm:
// 1. Check if triggers section exists (even if empty or has empty items)
// 2. If triggers section exists, find the next line after the last trigger node range
// 3. If no trigger section found, add triggers: section in the first line of yaml
export function insertTriggerSnippet(
  model: monaco.editor.ITextModel,
  yamlDocument: Document | null,
  triggerType: string,
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
    const { range: keyRange, indentLevel: expectedIndent } = getSectionKeyInfo(model, triggersPair);
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
        const lastCommentLine = findLastCommentLine(model, triggersKeyRange);
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

  const { range, text } = getInsertRangeAndTextForTriggers(
    model,
    replaceRange,
    insertAfterComment,
    insertAtLineNumber,
    insertText,
    commentCount,
    isReplacingFlowArray
  );

  model.pushEditOperations(null, [{ range, text }], () => null);

  if (editor) {
    editor.pushUndoStop();
  }
}
