/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { z } from '@kbn/zod';
import { useCallback } from 'react';
import { zodToJsonSchema } from 'zod-to-json-schema';

interface UseJsonValidationProps {
  schema: z.ZodSchema;
}

interface JsonValidationError {
  message: string;
  path: (string | number)[];
  lineNumber?: number;
  column?: number;
}

/**
 * Maps a JSON path to line/column position in the JSON text using a more precise approach
 */
function findPositionFromPath(
  jsonText: string,
  path: (string | number)[]
): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
  if (path.length === 0) {
    return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };
  }

  const lines = jsonText.split('\n');
  const targetKey = path[path.length - 1];

  if (typeof targetKey === 'string') {
    const searchPattern = `"${targetKey}"`;

    // Try to traverse the full path for better accuracy
    if (path.length > 1) {
      return findKeyInNestedPath(lines, path);
    }

    // For root-level properties, find the first occurrence that's a property key
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columnIndex = line.indexOf(searchPattern);
      if (columnIndex !== -1) {
        // Verify this is a property key by checking for colon after optional whitespace
        const afterMatch = line.substring(columnIndex + searchPattern.length).trim();
        if (afterMatch.startsWith(':')) {
          return {
            startLine: i + 1,
            startColumn: columnIndex + 1,
            endLine: i + 1,
            endColumn: columnIndex + searchPattern.length + 1,
          };
        }
      }
    }
  }

  // For array indices
  if (typeof targetKey === 'number') {
    return {
      startLine: Math.max(1, targetKey + 1),
      startColumn: 1,
      endLine: Math.max(1, targetKey + 1),
      endColumn: 10,
    };
  }

  // Final fallback
  return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 5 };
}

/**
 * Helper function to find a key in a nested path by traversing the JSON structure
 */
function findKeyInNestedPath(
  lines: string[],
  path: (string | number)[]
): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
  const targetKey = path[path.length - 1];

  if (typeof targetKey !== 'string') {
    return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 5 };
  }

  // Find all occurrences of the target key
  const searchPattern = `"${targetKey}"`;
  const matches: Array<{ line: number; column: number; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let searchIndex = 0;

    while (true) {
      const columnIndex = line.indexOf(searchPattern, searchIndex);
      if (columnIndex === -1) break;

      // Check if this is a property key
      const afterMatch = line.substring(columnIndex + searchPattern.length).trim();
      if (afterMatch.startsWith(':')) {
        matches.push({
          line: i + 1,
          column: columnIndex + 1,
          text: line.trim(),
        });
      }

      searchIndex = columnIndex + 1;
    }
  }

  if (matches.length === 0) {
    return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 5 };
  }

  // If there's only one match, use it
  if (matches.length === 1) {
    const match = matches[0];
    return {
      startLine: match.line,
      startColumn: match.column,
      endLine: match.line,
      endColumn: match.column + searchPattern.length,
    };
  }

  // For multiple matches, try to find the one that corresponds to our path depth
  // Use a simple heuristic: prefer matches that appear later in the file (deeper nesting)
  const match = matches[matches.length - 1];
  return {
    startLine: match.line,
    startColumn: match.column,
    endLine: match.line,
    endColumn: match.column + searchPattern.length,
  };
}

/**
 * Converts Zod validation errors to Monaco markers
 */
function zodErrorsToMarkers(zodError: z.ZodError, jsonText: string): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];

  for (const issue of zodError.issues) {
    let position;

    // Handle "unrecognized_keys" error specifically
    if (issue.code === 'unrecognized_keys' && 'keys' in issue) {
      // For unrecognized keys, Zod provides the keys in issue.keys
      const unrecognizedKeys = (issue as any).keys as string[];

      // Find each unrecognized key in the JSON and create a marker for it
      for (const key of unrecognizedKeys) {
        const keyPosition = findSpecificKey(jsonText, key, issue.path);
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Unrecognized key: "${key}"`,
          startLineNumber: keyPosition.startLine,
          startColumn: keyPosition.startColumn,
          endLineNumber: keyPosition.endLine,
          endColumn: keyPosition.endColumn,
          source: 'json-schema-validation',
        });
      }
    } else {
      // Handle other validation errors normally
      position = findPositionFromPath(jsonText, issue.path);
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: issue.message,
        startLineNumber: position.startLine,
        startColumn: position.startColumn,
        endLineNumber: position.endLine,
        endColumn: position.endColumn,
        source: 'json-schema-validation',
      });
    }
  }

  return markers;
}

/**
 * Find a specific key in the JSON text, considering the path context
 */
function findSpecificKey(
  jsonText: string,
  keyName: string,
  basePath: (string | number)[]
): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
  const lines = jsonText.split('\n');
  const searchPattern = `"${keyName}"`;

  // Find all occurrences of this key that are property keys
  const matches: Array<{ line: number; column: number; context: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let searchIndex = 0;

    while (true) {
      const columnIndex = line.indexOf(searchPattern, searchIndex);
      if (columnIndex === -1) break;

      // Check if this is a property key
      const afterMatch = line.substring(columnIndex + searchPattern.length).trim();
      if (afterMatch.startsWith(':')) {
        matches.push({
          line: i + 1,
          column: columnIndex + 1,
          context: line.trim(),
        });
      }

      searchIndex = columnIndex + 1;
    }
  }

  if (matches.length > 0) {
    // Strategy: if there are multiple matches, try to pick the most appropriate one
    // For unrecognized keys, we often want the one that's NOT in a nested valid structure

    if (matches.length === 1) {
      const match = matches[0];
      return {
        startLine: match.line,
        startColumn: match.column,
        endLine: match.line,
        endColumn: match.column + searchPattern.length,
      };
    }

    // For multiple matches, prefer later occurrences (often the problematic ones)
    // unless we have specific path context
    const preferredMatch = basePath.length > 0 ? matches[matches.length - 1] : matches[0];

    return {
      startLine: preferredMatch.line,
      startColumn: preferredMatch.column,
      endLine: preferredMatch.line,
      endColumn: preferredMatch.column + searchPattern.length,
    };
  }

  // Fallback
  return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 5 };
}

/**
 * Creates suggestions based on the JSON schema derived from the Zod schema
 */
function createSuggestionProviderFromSchema(
  jsonSchema: any
): monaco.languages.CompletionItemProvider {
  return {
    provideCompletionItems: (model, position) => {
      const suggestions: monaco.languages.CompletionItem[] = [];

      // Simple property suggestions for object schemas
      if (jsonSchema.type === 'object' && jsonSchema.properties) {
        const propertyNames = Object.keys(jsonSchema.properties);

        for (const propertyName of propertyNames) {
          const property = jsonSchema.properties[propertyName];
          suggestions.push({
            label: `"${propertyName}"`,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `"${propertyName}": `,
            documentation: property.description || `Property: ${propertyName}`,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            },
          });
        }
      }

      return { suggestions };
    },
  };
}

export interface UseJsonValidationResult {
  validateJson: (
    editor: monaco.editor.IStandaloneCodeEditor,
    jsonText: string
  ) => { isValid: boolean; errors: JsonValidationError[] };
  getJsonSchema: () => any;
  createSuggestionProvider: () => monaco.languages.CompletionItemProvider;
  createHoverProvider: () => monaco.languages.HoverProvider;
}

export function useJsonValidation({ schema }: UseJsonValidationProps): UseJsonValidationResult {
  const validateJson = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, jsonText: string) => {
      const model = editor.getModel();
      if (!model) {
        return { isValid: true, errors: [] };
      }

      try {
        // First, validate that it's valid JSON
        let parsedJson;
        try {
          parsedJson = JSON.parse(jsonText);
        } catch (jsonError) {
          const syntaxMarkers: monaco.editor.IMarkerData[] = [
            {
              severity: monaco.MarkerSeverity.Error,
              message: 'Invalid JSON syntax',
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1,
              source: 'json-syntax',
            },
          ];

          monaco.editor.setModelMarkers(model, 'json-validation', syntaxMarkers);
          return { isValid: false, errors: [{ message: 'Invalid JSON syntax', path: [] }] };
        }

        // Then validate against the Zod schema
        const result = schema.safeParse(parsedJson);

        if (result.success) {
          // Clear any existing markers
          monaco.editor.setModelMarkers(model, 'json-validation', []);
          return { isValid: true, errors: [] };
        } else {
          // Convert Zod errors to Monaco markers
          const markers = zodErrorsToMarkers(result.error, jsonText);
          monaco.editor.setModelMarkers(model, 'json-validation', markers);

          const errors: JsonValidationError[] = result.error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path,
          }));

          return { isValid: false, errors };
        }
      } catch (error) {
        // Handle any unexpected errors
        const errorMarkers: monaco.editor.IMarkerData[] = [
          {
            severity: monaco.MarkerSeverity.Error,
            message: 'Validation error occurred',
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
            source: 'validation-error',
          },
        ];

        monaco.editor.setModelMarkers(model, 'json-validation', errorMarkers);
        return { isValid: false, errors: [{ message: 'Validation error occurred', path: [] }] };
      }
    },
    [schema]
  );

  const getJsonSchema = useCallback(() => {
    try {
      return zodToJsonSchema(schema);
    } catch (error) {
      // Return empty schema if conversion fails
      return {};
    }
  }, [schema]);

  const createSuggestionProvider = useCallback(() => {
    const jsonSchema = getJsonSchema();
    return createSuggestionProviderFromSchema(jsonSchema);
  }, [getJsonSchema]);

  const createHoverProvider = useCallback(
    (): monaco.languages.HoverProvider => ({
      provideHover: (model, position) => {
        const markers = monaco.editor.getModelMarkers({
          resource: model.uri,
          owner: 'json-validation',
        });

        // Find if there's a marker at this position
        const marker = markers.find(
          (m) =>
            m.startLineNumber === position.lineNumber &&
            position.column >= m.startColumn &&
            position.column <= m.endColumn
        );

        if (marker) {
          return {
            range: {
              startLineNumber: marker.startLineNumber,
              startColumn: marker.startColumn,
              endLineNumber: marker.endLineNumber,
              endColumn: marker.endColumn,
            },
            contents: [{ value: `**Validation Error**` }, { value: marker.message }],
          };
        }

        return null;
      },
    }),
    []
  );

  return {
    validateJson,
    getJsonSchema,
    createSuggestionProvider,
    createHoverProvider,
  };
}
