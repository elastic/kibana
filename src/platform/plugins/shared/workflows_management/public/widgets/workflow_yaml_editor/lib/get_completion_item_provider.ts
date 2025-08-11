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
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import { MUSTACHE_REGEX_GLOBAL, UNFINISHED_MUSTACHE_REGEX_GLOBAL } from './regex';
import { getSchemaAtPath, parsePath } from '../../../../common/lib/zod_utils';

export interface LineParseResult {
  fullKey: string;
  pathSegments: string[] | null;
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
    const fullKey = cleanKey(atMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'at-trigger',
      match: atMatch,
    };
  }

  // Try unfinished mustache (e.g., "{{ consts.api" at end of line)
  const unfinishedMatch = [...lineUpToCursor.matchAll(UNFINISHED_MUSTACHE_REGEX_GLOBAL)].pop();
  if (unfinishedMatch) {
    const fullKey = cleanKey(unfinishedMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'mustache-unfinished',
      match: unfinishedMatch,
    };
  }

  // Try complete mustache (e.g., "{{ consts.apiUrl }}")
  const completeMatch = [...lineUpToCursor.matchAll(MUSTACHE_REGEX_GLOBAL)].pop();
  if (completeMatch) {
    const fullKey = cleanKey(completeMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'mustache-complete',
      match: completeMatch,
    };
  }

  return {
    fullKey: '',
    pathSegments: [],
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
  range: monaco.IRange,
  type: string
): monaco.languages.CompletionItem {
  const isAt = ['@'].includes(context.triggerCharacter ?? '');
  // $0 is the cursor position
  const insertText = isAt ? `{{ ${key}$0 }}` : key;
  return {
    label: key,
    kind: monaco.languages.CompletionItemKind.Field,
    range,
    insertText,
    detail: type,
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
        let context: z.ZodType = getContextSchemaForPath(result.data, workflowGraph, path);

        const lineUpToCursor = line.substring(0, position.column - 1);
        const parseResult = parseLineForCompletion(lineUpToCursor);
        const lastPathSegment = lineUpToCursor.endsWith('.')
          ? null
          : parseResult.pathSegments?.pop() ?? null;

        if (parseResult.fullKey) {
          const schemaAtPath = getSchemaAtPath(context, parseResult.fullKey, { partial: true });
          if (schemaAtPath) {
            context = schemaAtPath as z.ZodType;
          }
        }

        if (!(context instanceof z.ZodObject)) {
          return {
            suggestions: [],
          };
        }

        Object.keys(context.shape).forEach((key) => {
          if (lastPathSegment && !key.startsWith(lastPathSegment)) {
            return;
          }
          const current = getSchemaAtPath(context, key);
          suggestions.push(
            getSuggestion(
              parseResult.fullKey,
              key,
              completionContext,
              range,
              (current?._def as any)?.typeName?.toLowerCase().replace('zod', '') || ''
            )
          );
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
