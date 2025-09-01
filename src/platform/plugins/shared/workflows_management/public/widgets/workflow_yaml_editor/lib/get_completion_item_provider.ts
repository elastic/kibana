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
import { getAllConnectors } from '../../../../common/schema';
import {
  MUSTACHE_REGEX_GLOBAL,
  PROPERTY_PATH_REGEX,
  UNFINISHED_MUSTACHE_REGEX_GLOBAL,
} from '../../../../common/lib/regex';
import { getSchemaAtPath, getZodTypeName, parsePath } from '../../../../common/lib/zod_utils';

export interface LineParseResult {
  fullKey: string;
  pathSegments: string[] | null;
  matchType: 'at' | 'bracket-unfinished' | 'mustache-complete' | 'mustache-unfinished' | null;
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

/**
 * Generate a snippet template for a connector type with required parameters
 */
function generateConnectorSnippet(connectorType: string, shouldBeQuoted: boolean): string {
  const quotedType = shouldBeQuoted ? `"${connectorType}"` : connectorType;

  // Get required parameters for this connector type
  const requiredParams = getRequiredParamsForConnector(connectorType);

  if (requiredParams.length === 0) {
    // No required params, just add empty with block with a placeholder
    const snippet = `${quotedType}\nwith:\n  # Add parameters here`;
    return snippet;
  }

  // Create with block with required parameters as placeholders
  let withBlock = `${quotedType}\nwith:`;
  requiredParams.forEach((param) => {
    const placeholder = param.example || param.defaultValue || '';
    
    // Handle complex objects (like body) by formatting as YAML
    if (typeof placeholder === 'object' && placeholder !== null) {
      const yamlContent = formatObjectAsYaml(placeholder, 2);
      withBlock += `\n  ${param.name}:\n${yamlContent}`;
    } else {
      withBlock += `\n  ${param.name}: ${placeholder}`;
    }
  });

  return withBlock;
}

/**
 * Format an object as YAML with proper indentation
 */
function formatObjectAsYaml(obj: any, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      lines.push(formatObjectAsYaml(value, indentLevel + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      value.forEach(item => {
        if (typeof item === 'string') {
          lines.push(`${indent}  - "${item}"`);
        } else {
          lines.push(`${indent}  - ${item}`);
        }
      });
    } else if (typeof value === 'string') {
      lines.push(`${indent}${key}: "${value}"`);
    } else {
      lines.push(`${indent}${key}: ${value}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Extract example for body parameter based on its schema
 */
function extractBodyExample(bodySchema: z.ZodType): any {
  try {
    // Handle ZodOptional wrapper
    let schema = bodySchema;
    if (bodySchema instanceof z.ZodOptional) {
      schema = bodySchema._def.innerType;
    }
    
    // If it's a ZodObject, try to extract its shape and build YAML-compatible example
    if (schema instanceof z.ZodObject) {
      const shape = schema._def.shape();
      const example: any = {};
      
      // Extract examples from each field
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const field = fieldSchema as z.ZodType;
        const description = (field as any)?._def?.description || '';
        
        // Extract example from description if available
        const stringExampleMatch = description.match(/e\.g\.,?\s*"([^"]+)"/);
        const objectExampleMatch = description.match(/e\.g\.,?\s*(\{[^}]+\})/);
        
        if (stringExampleMatch) {
          example[key] = stringExampleMatch[1];
        } else if (objectExampleMatch) {
          try {
            example[key] = JSON.parse(objectExampleMatch[1]);
          } catch {
            // If JSON parse fails, use as string
            example[key] = objectExampleMatch[1];
          }
        }
        // No fallback - only use examples explicitly defined in enhanced connectors
      }
      
      if (Object.keys(example).length > 0) {
        return example; // Return object, not JSON string
      }
    }
  } catch (error) {
    // Fallback to empty object
  }
  
  return {};
}

/**
 * Extract required parameters from a Zod schema
 */
function extractRequiredParamsFromSchema(
  schema: z.ZodType
): Array<{ name: string; example?: string; defaultValue?: string; required: boolean }> {
  const params: Array<{
    name: string;
    example?: string;
    defaultValue?: string;
    required: boolean;
  }> = [];

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const zodField = fieldSchema as z.ZodType;

      // Skip common non-parameter fields
      if (['pretty', 'human', 'error_trace', 'source', 'filter_path'].includes(key)) {
        continue;
      }

      // Check if field is required (not optional)
      const isOptional = zodField instanceof z.ZodOptional;
      const isRequired = !isOptional;

      // Extract description for examples
      let description = '';
      let example = '';

      if ('description' in zodField && typeof zodField.description === 'string') {
        description = zodField.description;
        // Try to extract example from description
        const exampleMatch = description.match(
          /example[:\s]+['"]*([^'"]+)['"]*|default[:\s]+['"]*([^'"]+)['"]*/i
        );
        if (exampleMatch) {
          example = exampleMatch[1] || exampleMatch[2] || '';
        }
      }

      // Add some default examples based on common parameter names
      if (!example) {
        if (key === 'index') {
          example = 'my-index';
        } else if (key === 'id') {
          example = 'doc-id';
        } else if (key === 'body') {
          // Try to extract body structure from schema
          example = extractBodyExample(zodField);
        } else if (key === 'query') {
          example = '{}';
        } else if (key.includes('name')) {
          example = 'my-name';
        }
      }

      // Only include required parameters or very common ones
      if (isRequired || ['index', 'id', 'body'].includes(key)) {
        params.push({
          name: key,
          example,
          required: isRequired,
        });
      }
    }
  }

  return params;
}

/**
 * Get required parameters for a connector type from generated schemas
 */
function getRequiredParamsForConnector(
  connectorType: string
): Array<{ name: string; example?: string; defaultValue?: string }> {
  // Get all connectors (both static and generated)
  const allConnectors = getAllConnectors();

  // Find the connector by type
  const connector = allConnectors.find((c: any) => c.type === connectorType);

  if (connector && connector.paramsSchema) {
    try {
      // Check if this connector has enhanced examples
      const hasEnhancedExamples = (connector as any).examples?.params;
      
      console.log(`DEBUG getRequiredParamsForConnector - ${connectorType}`);
      console.log('Has enhanced examples:', hasEnhancedExamples);
      console.log('Connector examples:', (connector as any).examples);
      
      if (hasEnhancedExamples) {
        // Use examples directly from enhanced connector
        const exampleParams = (connector as any).examples.params;
        console.log('Using enhanced examples:', exampleParams);
        const result: Array<{ name: string; example?: any; defaultValue?: string }> = [];
        
        for (const [key, value] of Object.entries(exampleParams)) {
          // Include common important parameters for ES APIs
          if (['index', 'id', 'body', 'query', 'size', 'from', 'sort', 'aggs', 'aggregations', 'format'].includes(key)) {
            result.push({ name: key, example: value });
            console.log(`Added enhanced example: ${key} =`, value);
          }
        }
        
        if (result.length > 0) {
          console.log('Returning enhanced examples:', result);
          return result;
        }
      }

      // Fallback to extracting from schema
      const params = extractRequiredParamsFromSchema(connector.paramsSchema);

      // Return only required parameters, or most important ones if no required ones
      const requiredParams = params.filter((p) => p.required);
      if (requiredParams.length > 0) {
        return requiredParams.map((p) => ({ name: p.name, example: p.example }));
      }

      // If no required params, return the most important ones for ES APIs
      const importantParams = params.filter((p) => ['index', 'id', 'body', 'query', 'size', 'from', 'sort', 'aggs', 'aggregations', 'format'].includes(p.name));
      if (importantParams.length > 0) {
        return importantParams.slice(0, 3).map((p) => ({ name: p.name, example: p.example }));
      }
    } catch (error) {
      // Silently continue with fallback parameters
    }
  }

  // Fallback to basic hardcoded ones for non-ES connectors
  const basicConnectorParams: Record<string, Array<{ name: string; example?: string }>> = {
    console: [{ name: 'message', example: 'Hello World' }],
    slack: [{ name: 'message', example: 'Hello Slack' }],
    http: [
      { name: 'url', example: 'https://api.example.com' },
      { name: 'method', example: 'GET' },
    ],
    wait: [{ name: 'duration', example: '5s' }],
  };

  return basicConnectorParams[connectorType] || [];
}

/**
 * Get connector type suggestions with better grouping and filtering
 */
function getConnectorTypeSuggestions(
  typePrefix: string,
  range: monaco.IRange,
  context: monaco.languages.CompletionContext,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  // Get all connectors
  const allConnectors = getAllConnectors();

  // Helper function to create a suggestion with snippet
  const createSnippetSuggestion = (connectorType: string): monaco.languages.CompletionItem => {
    const snippetText = generateConnectorSnippet(connectorType, shouldBeQuoted);

    // For YAML, we insert the actual text without snippet placeholders
    const simpleText = snippetText;

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    return {
      label: connectorType,
      kind: monaco.languages.CompletionItemKind.Function, // Use Function kind
      insertText: simpleText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      documentation: connectorType.startsWith('elasticsearch.')
        ? `Elasticsearch API - ${connectorType.replace('elasticsearch.', '')}`
        : connectorType.startsWith('kibana.')
        ? `Kibana API - ${connectorType.replace('kibana.', '')}`
        : `Workflow connector - ${connectorType}`,
      filterText: connectorType,
      sortText: `!${connectorType}`, // Priority prefix to sort before default suggestions
      detail: 'Insert connector with parameters',
      preselect: false,
    };
  };

  // If user is typing a prefix like "elasticsearch.", show filtered suggestions
  if (typePrefix.includes('.')) {
    const [namespace] = typePrefix.split('.');
    const namespacePrefix = `${namespace}.`;

    const apis = allConnectors
      .filter((c: any) => c.type.startsWith(namespacePrefix))
      .map((c: any) => c.type)
      .filter((api: string) => api.toLowerCase().includes(typePrefix.toLowerCase()));
    //      .slice(0, 50); // Limit for performance

    apis.forEach((api) => {
      suggestions.push(createSnippetSuggestion(api));
    });
  } else {
    // Show all matching connectors
    // console.log('Debug autocomplete: typePrefix =', JSON.stringify(typePrefix));
    // console.log('Debug autocomplete: allConnectors count =', allConnectors.length);
    // console.log('Debug autocomplete: sample connector types =', allConnectors.slice(0, 5).map((c: any) => c.type));

    const matchingConnectors = allConnectors
      .map((c: any) => c.type)
      .filter((connectorType: string) => {
        const lowerType = connectorType.toLowerCase();
        const lowerPrefix = typePrefix.toLowerCase();

        // Match if the full type contains the prefix
        const fullMatch = lowerType.includes(lowerPrefix);

        // For elasticsearch connectors, also match if the part after "elasticsearch." starts with the prefix
        let elasticsearchMatch = false;
        if (connectorType.startsWith('elasticsearch.')) {
          const afterPrefix = connectorType.substring('elasticsearch.'.length);
          elasticsearchMatch = afterPrefix.toLowerCase().startsWith(lowerPrefix);
        }

        const matches = fullMatch || elasticsearchMatch;

        // if (typePrefix === 'e' && connectorType.startsWith('elasticsearch.e')) {
        //   console.log('Debug autocomplete: checking', connectorType, 'fullMatch:', fullMatch, 'elasticsearchMatch:', elasticsearchMatch, 'matches:', matches);
        // }

        return matches;
      });
    //      .slice(0, 50);

    // console.log('Debug autocomplete: matchingConnectors count =', matchingConnectors.length);
    // console.log('Debug autocomplete: first 10 matching =', matchingConnectors.slice(0, 10));

    matchingConnectors.forEach((connectorType) => {
      suggestions.push(createSnippetSuggestion(connectorType));
    });
    /*
    // Add namespace hints only if needed
    if (typePrefix.length === 0 || 'elasticsearch'.startsWith(typePrefix.toLowerCase())) {
      suggestions.push({
        label: 'elasticsearch.*',
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: shouldBeQuoted ? '"elasticsearch."' : 'elasticsearch.',
        range,
        documentation: `Elasticsearch APIs (${allConnectors.filter((c: any) => c.type.startsWith('elasticsearch.')).length} available)`,
        sortText: '!!elasticsearch', // Higher priority
        command: { id: 'editor.action.triggerSuggest', title: 'Trigger Suggest' },
      });
    }
      */

    if (typePrefix.length === 0 || 'kibana'.startsWith(typePrefix.toLowerCase())) {
      suggestions.push({
        label: 'kibana.*',
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: shouldBeQuoted ? '"kibana."' : 'kibana.',
        range,
        documentation: `Kibana APIs (${
          allConnectors.filter((c: any) => c.type.startsWith('kibana.')).length
        } available)`,
        sortText: '!!kibana', // Higher priority
        command: { id: 'editor.action.triggerSuggest', title: 'Trigger Suggest' },
      });
    }
  }

  return suggestions;
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

        // Try to parse with the strict schema first
        const result = parseWorkflowYamlToJSON(value, workflowYamlSchema);

        // If strict parsing fails, try with a more lenient approach for completion
        let workflowData = 'success' in result && result.success ? result.data : null;
        if (result.error) {
          // Try to parse the YAML as-is without strict schema validation
          try {
            const parsedYaml = yamlDocument.toJS();

            // If we have basic workflow structure, use it for completion context
            if (parsedYaml && typeof parsedYaml === 'object' && 'steps' in parsedYaml) {
              workflowData = parsedYaml;
            } else {
              return {
                suggestions: [],
                incomplete: false,
              };
            }
          } catch (yamlError) {
            return {
              suggestions: [],
              incomplete: false,
            };
          }
        }

        const workflowGraph = getWorkflowGraph(workflowData);
        const path = getCurrentPath(yamlDocument, absolutePosition);
        const yamlNode = yamlDocument.getIn(path, true);
        const scalarType = isScalar(yamlNode) ? yamlNode.type ?? null : null;

        // if we are in a plain scalar which starts with { or @, we need to add quotes otherwise template expression will break yaml
        const shouldBeQuoted =
          isScalar(yamlNode) &&
          scalarType === 'PLAIN' &&
          ((yamlNode?.value as string)?.startsWith('{') ||
            (yamlNode?.value as string)?.startsWith('@'));

        let context: z.ZodType;
        try {
          context = getContextSchemaForPath(workflowData, workflowGraph, path);
        } catch (contextError) {
          // Fallback to the main workflow schema if context detection fails
          context = workflowYamlSchema;
        }

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

        // SPECIAL CASE: Direct type completion in steps
        // Check if we're trying to complete a type field in a step, regardless of schema validation
        const typeCompletionMatch = lineUpToCursor.match(
          /^\s*-?\s*(?:name:\s*\w+\s*)?type:\s*(.*)$/i
        );

        // console.log('Debug autocomplete: lineUpToCursor =', JSON.stringify(lineUpToCursor));
        // console.log('Debug autocomplete: typeCompletionMatch =', typeCompletionMatch);

        if (typeCompletionMatch) {
          const typePrefix = typeCompletionMatch[1].replace(/['"]/g, '').trim();

          // For snippets, we need to replace from the start of the type value to the end of the line
          const typeValueStartColumn = lineUpToCursor.indexOf(typeCompletionMatch[1]) + 1;
          const adjustedRange = {
            startLineNumber: range.startLineNumber,
            endLineNumber: range.endLineNumber,
            startColumn: typeValueStartColumn,
            endColumn: line.length + 1, // Go to end of line to allow multi-line insertion
          };

          const typeSuggestions = getConnectorTypeSuggestions(
            typePrefix,
            adjustedRange,
            completionContext,
            scalarType,
            shouldBeQuoted
          );

          return {
            suggestions: typeSuggestions,
            incomplete: false, // Prevent other providers from adding suggestions
          };
        }

        // currently, we only suggest properties for objects
        if (!(context instanceof z.ZodObject)) {
          return {
            suggestions: [],
            incomplete: false,
          };
        }

        for (const [key, currentSchema] of Object.entries(context.shape) as [string, z.ZodType][]) {
          if (lastPathSegment && !key.startsWith(lastPathSegment)) {
            continue;
          }

          // Special handling for the 'type' field to provide better suggestions
          if (key === 'type' && path.length > 0 && path[path.length - 1] === 'steps') {
            // Check if we're completing the value after "type: "
            const typeValueMatch = lineUpToCursor.match(/type:\s*(.*)$/i);

            if (typeValueMatch) {
              const typePrefix = typeValueMatch[1].replace(/['"]/g, '').trim();

              // Adjust range to replace the entire value after "type: "
              const adjustedRange = {
                startLineNumber: range.startLineNumber,
                endLineNumber: range.endLineNumber,
                startColumn: lineUpToCursor.indexOf(typeValueMatch[1]) + 1,
                endColumn: line.length + 1, // Extended to allow multi-line
              };

              const typeSuggestions = getConnectorTypeSuggestions(
                typePrefix,
                adjustedRange,
                completionContext,
                scalarType,
                shouldBeQuoted
              );

              // Return immediately to prevent schema-based literal completions
              return {
                suggestions: typeSuggestions,
                incomplete: false,
              };
            } else {
              // For key completion, provide a custom "type:" completion that triggers snippet completion
              const propertyTypeName = getZodTypeName(currentSchema);
              const typeKeySuggestion = getSuggestion(
                key,
                completionContext,
                range,
                scalarType,
                shouldBeQuoted,
                propertyTypeName,
                'Connector type - choose from available connectors'
              );

              // Override the completion to trigger suggest after insertion
              typeKeySuggestion.command = {
                id: 'editor.action.triggerSuggest',
                title: 'Trigger Suggest',
              };

              suggestions.push(typeKeySuggestion);
            }
          } else {
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
        }

        // Remove duplicates, keeping the ones with better sort priority
        const uniqueSuggestions = suggestions.reduce((acc, curr) => {
          const existingIndex = acc.findIndex((s) => s.label === curr.label);
          if (existingIndex === -1) {
            return [...acc, curr];
          }
          // Keep the one with better sort priority (starts with !)
          if (curr.sortText && curr.sortText.startsWith('!')) {
            acc[existingIndex] = curr;
          }
          return acc;
        }, [] as monaco.languages.CompletionItem[]);

        return {
          suggestions: uniqueSuggestions,
          incomplete: false, // Prevent other providers from adding when we handle type field
        };
      } catch (error) {
        if (error instanceof YAMLParseError) {
          // Failed to parse YAML, skip suggestions
          return {
            suggestions: [],
            incomplete: false,
          };
        }
        throw error;
      }
    },
  };
}
