/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { YAMLParseError, parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import _ from 'lodash';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml-utils';
import { getContextForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import { MUSTACHE_REGEX_GLOBAL, UNFINISHED_MUSTACHE_REGEX_GLOBAL } from './regex';

export interface LineParseResult {
  fullKey: string;
  matchType: 'at-trigger' | 'mustache-complete' | 'mustache-unfinished' | null;
  match: RegExpMatchArray | null;
}

function cleanKey(key: string) {
  if (key === '.') {
    // special expression in mustache for current object
    return key;
  }
  // remove trailing dot if it exists
  return key.endsWith('.') ? key.slice(0, -1) : key;
}

export function parseLineForCompletion(lineUpToCursor: string): LineParseResult {
  // Try @ trigger first (e.g., "@const" or "@steps.step1")
  const atMatch = [...lineUpToCursor.matchAll(/@(?<key>\S+?)?\.?(?=\s|$)/g)].pop();
  if (atMatch) {
    return {
      fullKey: cleanKey(atMatch.groups?.key ?? ''),
      matchType: 'at-trigger',
      match: atMatch,
    };
  }

  // Try unfinished mustache (e.g., "{{ consts.api" at end of line)
  const unfinishedMatch = [...lineUpToCursor.matchAll(UNFINISHED_MUSTACHE_REGEX_GLOBAL)].pop();
  if (unfinishedMatch) {
    return {
      fullKey: cleanKey(unfinishedMatch.groups?.key ?? ''),
      matchType: 'mustache-unfinished',
      match: unfinishedMatch,
    };
  }

  // Try complete mustache (e.g., "{{ consts.apiUrl }}")
  const completeMatch = [...lineUpToCursor.matchAll(MUSTACHE_REGEX_GLOBAL)].pop();
  if (completeMatch) {
    return {
      fullKey: cleanKey(completeMatch.groups?.key ?? ''),
      matchType: 'mustache-complete',
      match: completeMatch,
    };
  }

  return {
    fullKey: '',
    matchType: null,
    match: null,
  };
}

export function getDetail(fullKey: string, insertText: string) {
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

export function getSuggestion(
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
      try {
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
        if (result.error) {
          // Failed to parse YAML into valid definition, skip suggestions
          return {
            suggestions: [],
          };
        }
        const workflowGraph = getWorkflowGraph(result.data);
        const path = getCurrentPath(yamlDocument, absolutePosition);
        let context = getContextForPath(result.data, workflowGraph, path);

        const lineUpToCursor = line.substring(0, position.column - 1);
        const parseResult = parseLineForCompletion(lineUpToCursor);
        let scopedContext = context;

        if (parseResult.fullKey) {
          scopedContext = _.get(context, parseResult.fullKey);
          if (scopedContext) {
            context = scopedContext;
          }
        }

        Object.keys(context).forEach((key) => {
          suggestions.push(getSuggestion(parseResult.fullKey, key, completionContext, range));
        });

        return {
          suggestions,
        };
      } catch (error) {
        if (error instanceof YAMLParseError) {
          // Failed to parse YAML, skip suggestions
          return {
            suggestions: [],
          };
        }
        throw error;
      }
    },
  };
}
