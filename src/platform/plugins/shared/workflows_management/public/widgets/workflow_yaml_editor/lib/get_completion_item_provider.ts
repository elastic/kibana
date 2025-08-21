/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { YAMLParseError, parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import type { HttpSetup } from '@kbn/core/public';
import _ from 'lodash';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { getContextForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import { MUSTACHE_REGEX_GLOBAL, UNFINISHED_MUSTACHE_REGEX_GLOBAL } from './regex';
import { getOrBuildEndpointIndex } from './console_specs/indexer';

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

function isWithinEsApiStep(textBeforeCursor: string): boolean {
  // Look back for a nearby elasticsearch.request type within the current step block
  const lines = textBeforeCursor.split('\n').reverse();
  let indentOfType: number | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trimStart();
    if (!trimmed) continue;
    const indent = line.length - trimmed.length;
    if (/^type:\s*["']?elasticsearch\.request["']?\s*$/.test(trimmed)) {
      indentOfType = indent;
      return true;
    }
    // If we reached a less-indented list item start, we likely left this step
    if (/^-\s+name:/.test(trimmed) && indentOfType !== null && indent <= indentOfType) {
      return false;
    }
  }
  return false;
}

function isKeyOnCurrentLine(lineUpToCursor: string, key: 'method' | 'path'): boolean {
  const re = new RegExp(`\\b${key}\\s*:\\s*`);
  return re.test(lineUpToCursor);
}

function getEsMethodSuggestions(range: monaco.IRange): monaco.languages.CompletionItem[] {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
  return methods.map((m) => ({
    label: m,
    kind: monaco.languages.CompletionItemKind.Keyword,
    range,
    insertText: m,
    detail: 'HTTP method',
  }));
}

function getEsPathSuggestions(range: monaco.IRange): monaco.languages.CompletionItem[] {
  const paths = ['/_cluster/health', '/_search', '/_cat/indices', '/_cat/health', '/_stats'];
  return paths.map((p) => ({
    label: p,
    kind: monaco.languages.CompletionItemKind.Value,
    range,
    insertText: p,
    detail: 'Elasticsearch endpoint',
  }));
}

export function getCompletionItemProvider(
  workflowYamlSchema: z.ZodSchema,
  http?: HttpSetup
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['@', '.', '{', '/', '_'],
    provideCompletionItems: async (model, position, completionContext) => {
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
        const lineUpToCursor = line.substring(0, position.column - 1);

        // Parse per-line signals first to avoid heavy work on focus/click
        const parseResult = parseLineForCompletion(lineUpToCursor);

        // Cheap slice of text before cursor (avoid full getValue unless necessary)
        const textBeforeCursor = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // Heuristic ES API suggestions when inside an elasticsearch.request step
        if (isWithinEsApiStep(textBeforeCursor)) {
          // Try spec-driven suggestions first if available
          let usedSpec = false;
          try {
            const endpointIndex = await getOrBuildEndpointIndex(http);
            if (endpointIndex.size > 0) {
              usedSpec = true;
              if (isKeyOnCurrentLine(lineUpToCursor, 'method')) {
                return { suggestions: getEsMethodSuggestions(range) };
              }
              if (isKeyOnCurrentLine(lineUpToCursor, 'path')) {
                const uniquePaths = new Set<string>();
                for (const entry of endpointIndex.values()) {
                  for (const p of entry.patterns) uniquePaths.add(p);
                }
                const suggestions = [...uniquePaths].slice(0, 200).map((p) => ({
                  label: p,
                  kind: monaco.languages.CompletionItemKind.Value,
                  range,
                  insertText: p,
                  detail: 'Elasticsearch endpoint',
                }));
                return { suggestions };
              }
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.debug('Spec-driven completion failed; falling back to heuristics', e);
          }

          // Fallback heuristics
          if (!usedSpec) {
            if (isKeyOnCurrentLine(lineUpToCursor, 'method')) {
              return { suggestions: getEsMethodSuggestions(range) };
            }
            if (isKeyOnCurrentLine(lineUpToCursor, 'path')) {
              return { suggestions: getEsPathSuggestions(range) };
            }
          }
        }

        // If there is no relevant trigger/match, bail out early with no suggestions
        const isTriggeredByChar = completionContext.triggerCharacter != null;
        if (!isTriggeredByChar && parseResult.matchType === null) {
          return { suggestions: [] };
        }

        // Heavy parsing for @/mustache context-aware suggestions
        const value = model.getValue();
        const absolutePosition = model.getOffsetAt(position);
        let yamlDocument: any = null;
        try {
          yamlDocument = parseDocument(value);
        } catch {
          yamlDocument = null;
        }

        // Try schema-backed parsing; on failure, fall back to minimal suggestions
        let workflowData: any | null = null;
        try {
          const result = parseWorkflowYamlToJSON(value, workflowYamlSchema);
          workflowData = result.success ? result.data : null;
        } catch {
          workflowData = null;
        }

        // Minimal context when schema parse fails
        if (!workflowData) {
          const suggestions: monaco.languages.CompletionItem[] = [];
          // Provide top-level roots for @-trigger scenarios
          ['steps', 'consts', 'inputs', 'event', 'workflow'].forEach((key) => {
            suggestions.push(getSuggestion(parseResult.fullKey, key, completionContext, range));
          });
          return { suggestions };
        }

        const workflowGraph = getWorkflowGraph(workflowData);
        const path = yamlDocument ? getCurrentPath(yamlDocument, absolutePosition) : [];
        let context = getContextForPath(workflowData, workflowGraph, path);

        const suggestions: monaco.languages.CompletionItem[] = [];

        // If context is not an object (e.g., editing inside a scalar), fall back to default roots
        const provideDefaultRootSuggestions = () => {
          ['steps', 'consts', 'inputs', 'event', 'workflow'].forEach((key) => {
            suggestions.push(getSuggestion(parseResult.fullKey, key, completionContext, range));
          });
        };

        if (typeof context !== 'object' || context === null) {
          provideDefaultRootSuggestions();
          return { suggestions };
        }

        let scopedContext = context;
        if (parseResult.fullKey) {
          scopedContext = _.get(context, parseResult.fullKey);
          if (typeof scopedContext === 'object' && scopedContext !== null) {
            context = scopedContext;
          } else {
            provideDefaultRootSuggestions();
            return { suggestions };
          }
        }

        Object.keys(context).forEach((key) => {
          suggestions.push(getSuggestion(parseResult.fullKey, key, completionContext, range));
        });

        return { suggestions };
      } catch (error) {
        if (error instanceof YAMLParseError) {
          return { suggestions: [] };
        }
        // eslint-disable-next-line no-console
        console.debug('Completion provider error', error);
        return { suggestions: [] };
      }
    },
  };
}
