/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { type Document } from 'yaml';
import { getTriggerNodes } from '../../../../../common/lib/yaml_utils';
import { getMonacoRangeFromYamlNode } from '../utils';
import { getIndentLevelFromLineNumber } from '../get_indent_level';
import { prependIndentToLines } from '../prepend_indent_to_lines';
import { generateTriggerSnippet } from './generate_trigger_snippet';

// Algorithm:
// 1. Find the next line after the last trigger node range
// 2. If no trigger nodes found, add triggers: section in the first line of yaml

export function insertTriggerSnippet(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  triggerType: string
) {
  const triggerSnippet = generateTriggerSnippet(triggerType, false, true);
  // find triggers: line number and column number
  const triggerNodes = getTriggerNodes(yamlDocument);
  const triggerNode = triggerNodes.find((node) => node.triggerType === triggerType);
  let prepend = '';
  let range = new monaco.Range(1, 1, 1, 1);
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
      range = new monaco.Range(
        lastTriggerRange.endLineNumber + 1,
        1,
        lastTriggerRange.endLineNumber + 1,
        1
      );
      indentLevel = getIndentLevelFromLineNumber(model, lastTriggerRange.startLineNumber);
    }
  } else {
    prepend = 'triggers:\n  ';
  }
  model.pushEditOperations(
    null,
    [
      {
        range,
        text: prepend + prependIndentToLines(triggerSnippet, indentLevel) + '\n',
      },
    ],
    () => null
  );
}
