/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { Document } from 'yaml';
import { BuiltInStepTypes } from '@kbn/workflows/spec/schema';
import { getStepNodeAtPosition, getStepNodesWithType } from '../../../../../common/lib/yaml_utils';
import { getMonacoRangeFromYamlNode } from '../utils';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { generateBuiltInStepSnippet } from './generate_builtin_step_snippet';
import { generateConnectorSnippet } from './generate_connector_snippet';

// Algorithm:
// 1. If no cursor position is provided, find the next line after the last step node in root range
// 2. If cursor position is provided, get next line after the end of step node nearest to the cursor (including nested steps, e.g. foreach, if, etc.)
// 3. If no step nodes found, add "steps:" section in the first line of yaml

export function insertStepSnippet(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  stepType: string,
  cursorPosition?: monaco.Position | null
) {
  let snippetText = '';
  if (BuiltInStepTypes.includes(stepType)) {
    snippetText = generateBuiltInStepSnippet(stepType, false, true);
  } else {
    snippetText = generateConnectorSnippet(stepType, false, true);
  }
  // we need it to be 1-indexed
  const lastLineNumber = model.getLineCount();
  let prepend = '';
  // by default, insert at line after the last line of the yaml file
  let insertAtLineNumber = lastLineNumber + 1;
  const stepNodes = getStepNodesWithType(yamlDocument);
  let nearestStepNode = null;
  if (cursorPosition) {
    const absolutePosition = model.getOffsetAt(cursorPosition);
    nearestStepNode = getStepNodeAtPosition(yamlDocument, absolutePosition);
  }
  const stepNode = nearestStepNode || (stepNodes[stepNodes.length - 1] ?? null);
  let indentLevel = 0;
  if (!stepNode) {
    prepend = 'steps:\n  ';
  } else {
    const stepRange = getMonacoRangeFromYamlNode(model, stepNode);
    if (stepRange) {
      insertAtLineNumber =
        stepRange.endLineNumber === lastLineNumber ? lastLineNumber + 1 : stepRange.endLineNumber;
      // get indent from the first line of the step node
      indentLevel = getIndentLevelFromLineNumber(model, stepRange.startLineNumber);
    }
  }
  model.pushEditOperations(
    null,
    [
      {
        range: new monaco.Range(insertAtLineNumber, 1, insertAtLineNumber, 1),
        text: prepend + prependIndentToLines(snippetText, indentLevel) + '\n',
      },
    ],
    () => null
  );
}
