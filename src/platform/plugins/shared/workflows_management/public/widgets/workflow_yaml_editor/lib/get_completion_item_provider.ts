/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml-utils';
import { getContextForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import _ from 'lodash';
import { MUSTACHE_REGEX } from './mustache';

function getInsertText(triggerCharacter: string | undefined, key: string) {
  return key;
  if (!triggerCharacter) {
    return key;
  }

  if (['@', '{', ' '].includes(triggerCharacter)) {
    return `{{ ${key} }}`;
  }
  return key;
}

export function getCompletionItemProvider(
  workflowYamlSchema: z.ZodSchema
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['@', '.', '{'],
    provideCompletionItems: (model, position, _context, _token) => {
      const { lineNumber } = position;
      const line = model.getLineContent(lineNumber);
      const wordUntil = model.getWordUntilPosition(position);
      const word = model.getWordAtPosition(position) || wordUntil;
      const { startColumn, endColumn } = word;
      const range = {
        startLineNumber: lineNumber,
        endLineNumber: lineNumber,
        startColumn,
        endColumn,
      };
      const absolutePosition = model.getOffsetAt(position);
      const suggestions: monaco.languages.CompletionItem[] = [];
      const value = model.getValue();
      const yamlDocument = parseDocument(value);
      const result = parseWorkflowYamlToJSON(value, workflowYamlSchema);
      const workflowGraph = getWorkflowGraph(result.data);
      const path = getCurrentPath(yamlDocument, absolutePosition);
      let context = getContextForPath(result.data, workflowGraph, path);

      const match = line.match(/@(\w+)?/) || MUSTACHE_REGEX.exec(line);

      // if (!match) {
      //   return {
      //     suggestions: [],
      //   };
      // }

      if (match?.[1]) {
        context = _.get(context, match[1]);
      }

      Object.keys(context).forEach((key) => {
        suggestions.push({
          label: key,
          kind: ['steps', 'consts', 'secrets'].includes(key)
            ? monaco.languages.CompletionItemKind.Folder
            : monaco.languages.CompletionItemKind.Field,
          range,
          insertText: getInsertText(_context.triggerCharacter, key),
        });
      });

      return {
        suggestions,
      };
    },
  };
}
