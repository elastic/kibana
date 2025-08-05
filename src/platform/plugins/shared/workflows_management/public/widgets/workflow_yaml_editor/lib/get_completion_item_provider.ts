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
import _ from 'lodash';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml-utils';
import { getContextForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import { MUSTACHE_REGEX_GLOBAL, UNFINISHED_MUSTACHE_REGEX_GLOBAL } from './regex';

function getDetail(fullKey: string, insertText: string) {
  if (insertText.endsWith('output')) {
    return 'Step output';
  }
  if (insertText.includes('steps')) {
    return 'State of previous steps';
  }
  if (insertText.includes('consts')) {
    return 'Workflow constants';
  }
  return undefined;
}

function getSuggestion(
  fullKey: string,
  key: string,
  context: monaco.languages.CompletionContext,
  range: monaco.IRange
): monaco.languages.CompletionItem {
  const isAt = ['@'].includes(context.triggerCharacter ?? '');
  // $0 is the cursor position
  const insertText = isAt ? `{{ ${key}$0 }}` : key;
  return {
    label: key,
    kind: ['steps', 'consts', 'secrets'].includes(key)
      ? monaco.languages.CompletionItemKind.Folder
      : monaco.languages.CompletionItemKind.Field,
    range,
    insertText,
    detail: getDetail(fullKey, insertText),
    insertTextRules: isAt
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : monaco.languages.CompletionItemInsertTextRule.None,
    additionalTextEdits: isAt
      ? [
          {
            // remove the @
            range: {
              startLineNumber: range.startLineNumber,
              endLineNumber: range.endLineNumber,
              startColumn: range.startColumn - 1,
              endColumn: range.endColumn,
            },
            text: '',
          },
        ]
      : [],
  };
}

export function getCompletionItemProvider(
  workflowYamlSchema: z.ZodSchema
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['@', '.', '{'],
    provideCompletionItems: (model, position, completionContext) => {
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

      const lineUpToCursor = line.substring(0, position.column - 1);
      const lastMatch =
        [...lineUpToCursor.matchAll(/@(?<key>\S+?)?\.?(?=\s|$)/g)].pop() ||
        [...lineUpToCursor.matchAll(UNFINISHED_MUSTACHE_REGEX_GLOBAL)].pop() ||
        [...lineUpToCursor.matchAll(MUSTACHE_REGEX_GLOBAL)].pop();
      const fullKey = lastMatch?.[1] ?? '';
      let scopedContext = context;

      if (fullKey) {
        scopedContext = _.get(context, fullKey);
        if (scopedContext) {
          context = scopedContext;
        }
      }

      Object.keys(context).forEach((key) => {
        suggestions.push(getSuggestion(fullKey, key, completionContext, range));
      });

      return {
        suggestions,
      };
    },
  };
}
