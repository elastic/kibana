/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { monaco } from '@kbn/monaco';
import { isBuiltInStepType } from '@kbn/workflows';
import { generateBuiltInStepSnippet } from './generate_builtin_step_snippet';
import { generateConnectorSnippet } from './generate_connector_snippet';
import { getStepNodeAtPosition, getStepNodesWithType } from '../../../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { getMonacoRangeFromYamlNode } from '../utils';

// Algorithm:
// 1. If no cursor position is provided, find the next line after the last step node in root range
// 2. If cursor position is provided, get next line after the end of step node nearest to the cursor (including nested steps, e.g. foreach, if, etc.)
// 3. If no step nodes found, add "steps:" section in the first line of yaml

export function insertStepSnippet(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  stepType: string,
  cursorPosition?: monaco.Position | null,
  editor?: monaco.editor.IStandaloneCodeEditor
) {
  let snippetText = '';
  // we need it to be 1-indexed
  const lastLineNumber = model.getLineCount();
  let insertStepsSection = false;
  // by default, insert at line after the last line of the yaml file
  let insertAtLineNumber = lastLineNumber + 1;
  const stepNodes = getStepNodesWithType(yamlDocument);
  let nearestStepNode = null;
  if (cursorPosition) {
    const absolutePosition = model.getOffsetAt(cursorPosition);
    nearestStepNode = getStepNodeAtPosition(yamlDocument, absolutePosition);
  }
  const stepNode =
    nearestStepNode || (stepNodes.length > 0 ? stepNodes[stepNodes.length - 1] : null);
  let indentLevel = 0;
  if (!stepNode) {
    insertStepsSection = true;
    indentLevel = 2;
  } else {
    const stepRange = getMonacoRangeFromYamlNode(model, stepNode);
    if (stepRange) {
      insertAtLineNumber =
        stepRange.endLineNumber === lastLineNumber ? lastLineNumber + 1 : stepRange.endLineNumber;
      // get indent from the first line of the step node
      indentLevel = getIndentLevelFromLineNumber(model, stepRange.startLineNumber);
    }
  }

  if (isBuiltInStepType(stepType)) {
    snippetText = generateBuiltInStepSnippet(stepType, {
      full: true,
      withStepsSection: insertStepsSection,
    });
  } else {
    snippetText = generateConnectorSnippet(stepType, {
      full: true,
      withStepsSection: insertStepsSection,
    });
  }

  // Create separate undo boundary for each snippet insertion
  if (editor) {
    editor.pushUndoStop();
  }

  model.pushEditOperations(
    null,
    [
      {
        range: new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1),
        // if we are inserting the steps section, we don't need to indent the snippet, the step is at root level
        text: insertStepsSection ? snippetText : prependIndentToLines(snippetText, indentLevel),
      },
    ],
    () => null
  );

  if (editor) {
    editor.pushUndoStop();
  }
}
