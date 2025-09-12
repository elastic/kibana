/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scalar } from 'yaml';
import { YAMLParseError, isScalar, parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import {
  VARIABLE_REGEX_GLOBAL,
  PROPERTY_PATH_REGEX,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
} from '../../../../common/lib/regex';
import { getSchemaAtPath, getZodTypeName, parsePath } from '../../../../common/lib/zod_utils';

export interface LineParseResult {
  fullKey: string;
  pathSegments: string[] | null;
  matchType: 'at' | 'bracket-unfinished' | 'variable-complete' | 'variable-unfinished' | null;
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
      matchType: 'at',
      match: atMatch,
    };
  }

  // Try unfinished mustache (e.g., "{{ consts.api" at end of line)
  const unfinishedMatch = [...lineUpToCursor.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)].pop();
  if (unfinishedMatch) {
    const fullKey = cleanKey(unfinishedMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'variable-unfinished',
      match: unfinishedMatch,
    };
  }

  // Try complete mustache (e.g., "{{ consts.apiUrl }}")
  const completeMatch = [...lineUpToCursor.matchAll(VARIABLE_REGEX_GLOBAL)].pop();
  if (completeMatch) {
    const fullKey = cleanKey(completeMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'variable-complete',
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

export function getSuggestion(
  key: string,
  context: monaco.languages.CompletionContext,
  range: monaco.IRange,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean,
  type: string,
  description?: string
): monaco.languages.CompletionItem {
  let keyToInsert = key;
  const isAt = context.triggerCharacter === '@';
  const keyCouldAccessedByDot = PROPERTY_PATH_REGEX.test(key);
  const removeDot = isAt || !keyCouldAccessedByDot;

  if (!keyCouldAccessedByDot) {
    // we need to use opposite quote type if we are in a string
    const q = scalarType === 'QUOTE_DOUBLE' ? "'" : '"';
    keyToInsert = `[${q}${key}${q}]`;
  }

  let insertText = keyToInsert;
  let insertTextRules = monaco.languages.CompletionItemInsertTextRule.None;
  if (isAt) {
    insertText = `{{ ${key}$0 }}`;
    insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  }
  if (shouldBeQuoted) {
    insertText = `"${insertText}"`;
  }
  // $0 is the cursor position
  return {
    label: key,
    kind: monaco.languages.CompletionItemKind.Field,
    range,
    insertText,
    detail: `${type}` + (description ? `: ${description}` : ''),
    insertTextRules,
    additionalTextEdits: removeDot
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
    triggerCharacters: ['@', '.'],
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
        const yamlNode = yamlDocument.getIn(path, true);
        const scalarType = isScalar(yamlNode) ? yamlNode.type ?? null : null;
        // if we are in a plain scalar which starts with { or @, we need to add quotes otherwise template expression will break yaml
        const shouldBeQuoted =
          isScalar(yamlNode) &&
          scalarType === 'PLAIN' &&
          ((yamlNode?.value as string)?.startsWith('{') ||
            (yamlNode?.value as string)?.startsWith('@'));

        let context: z.ZodType = getContextSchemaForPath(result.data, workflowGraph, path);

        const lineUpToCursor = line.substring(0, position.column - 1);
        const parseResult = parseLineForCompletion(lineUpToCursor);
        const lastPathSegment = lineUpToCursor.endsWith('.')
          ? null
          : parseResult.pathSegments?.pop() ?? null;

        if (parseResult.fullKey) {
          const schemaAtPath = getSchemaAtPath(context, parseResult.fullKey, { partial: true });
          if (schemaAtPath) {
            context = schemaAtPath;
          }
        }

        // currently, we only suggest properties for objects
        if (!(context instanceof z.ZodObject)) {
          return {
            suggestions: [],
          };
        }

        for (const [key, currentSchema] of Object.entries(context.shape) as [string, z.ZodType][]) {
          if (lastPathSegment && !key.startsWith(lastPathSegment)) {
            return;
          }
          const propertyTypeName = getZodTypeName(currentSchema);
          suggestions.push(
            getSuggestion(
              key,
              completionContext,
              range,
              scalarType,
              shouldBeQuoted,
              propertyTypeName,
              currentSchema?.description
            )
          );
        }

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
