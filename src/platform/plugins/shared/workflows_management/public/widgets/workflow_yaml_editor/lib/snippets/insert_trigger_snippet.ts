/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, isNode, parseDocument, type Range } from 'yaml';
import { isSeq } from 'yaml';
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

    // If triggers section is empty (no triggers with type field), replace the empty content
    if (
      triggerNodes.length === 0 &&
      triggersPair.value &&
      isSeq(triggersPair.value) &&
      triggersPair.value.items.length > 0
    ) {
      const lastItem = triggersPair.value.items[triggersPair.value.items.length - 1];
      let emptyItemLineNumber: number | null = null;

      if (isNode(lastItem) && lastItem.range) {
        const lastItemRange = getMonacoRangeFromYamlRange(model, lastItem.range as Range);
        if (lastItemRange) {
          emptyItemLineNumber = lastItemRange.startLineNumber;
        }
      }

      if (emptyItemLineNumber !== null) {
        replaceRange = createReplacementRange(model, emptyItemLineNumber);
        const lineContent = model.getLineContent(emptyItemLineNumber);
        const indentMatch = lineContent.match(/^(\s*)/);
        indentLevel = indentMatch ? indentMatch[1].length : expectedIndent;
      }
    } else if (triggerNodes.length > 0) {
      const lastTriggerRange = getMonacoRangeFromYamlNode(
        model,
        triggerNodes[triggerNodes.length - 1].node
      );
      if (lastTriggerRange) {
        // add a newline after the last trigger
        insertAtLineNumber = lastTriggerRange.endLineNumber;
        indentLevel = getIndentLevelFromLineNumber(model, lastTriggerRange.startLineNumber);
      }
    } else if (triggersKeyRange) {
      // Triggers section exists but is completely empty, insert after triggers:
      insertAtLineNumber = triggersKeyRange.endLineNumber + 1;
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
