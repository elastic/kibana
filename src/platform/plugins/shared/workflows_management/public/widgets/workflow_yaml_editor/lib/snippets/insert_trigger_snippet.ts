/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { TriggerType } from '@kbn/workflows';
import { generateTriggerSnippet } from './generate_trigger_snippet';
import { getTriggerNodes } from '../../../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { getMonacoRangeFromYamlNode } from '../utils';

// Algorithm:
// 1. Find the next line after the last trigger node range
// 2. If no trigger nodes found, add triggers: section in the first line of yaml

export function insertTriggerSnippet(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  triggerType: TriggerType,
  editor?: monaco.editor.IStandaloneCodeEditor
) {
  // find triggers: line number and column number
  const triggerNodes = getTriggerNodes(yamlDocument);
  const triggerNode = triggerNodes.find((node) => node.triggerType === triggerType);
  let insertTriggersSection = false;
  let insertAtLineNumber = 1;
  let indentLevel = 0;
  if (triggerNode) {
    // do not override existing trigger
    return;
  }
  if (triggerNodes.length > 0) {
    const lastTriggerRange = getMonacoRangeFromYamlNode(
      model,
      triggerNodes[triggerNodes.length - 1].node
    );
    if (lastTriggerRange) {
      // add a newline after the last trigger
      insertAtLineNumber = lastTriggerRange.endLineNumber;
      indentLevel = getIndentLevelFromLineNumber(model, lastTriggerRange.startLineNumber);
    }
  } else {
    insertTriggersSection = true;
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
        range: new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1),
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
