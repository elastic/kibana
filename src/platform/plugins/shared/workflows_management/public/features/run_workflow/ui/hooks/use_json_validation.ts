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
 * Maps a JSON path to line/column position in the JSON text using a reliable approach
 */
function findPositionFromPath(
  jsonText: string,
  path: (string | number)[]
): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
  if (path.length === 0) {
    return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };
  }

  // For root-level errors, highlight the entire first line
  if (path.length === 1 && typeof path[0] === 'string') {
    const targetProperty = path[0];
    const searchPattern = `"${targetProperty}"`;
    const lines = jsonText.split('\n');
    
    // Find the property key in the JSON
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columnIndex = line.indexOf(searchPattern);
      if (columnIndex !== -1) {
        // Check if this is a property key (followed by colon)
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

  // For nested properties, try to find the specific property
  const targetProperty = path[path.length - 1];
  if (typeof targetProperty === 'string') {
    const searchPattern = `"${targetProperty}"`;
    const lines = jsonText.split('\n');
    
    // Simple search for the property name
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columnIndex = line.indexOf(searchPattern);
      if (columnIndex !== -1) {
        return {
          startLine: i + 1,
          startColumn: columnIndex + 1,
          endLine: i + 1,
          endColumn: columnIndex + searchPattern.length + 1,
        };
      }
    }
  }
  
  // Final fallback - highlight first few characters
  return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 5 };
}

/**
 * Converts Zod validation errors to Monaco markers
 */
function zodErrorsToMarkers(zodError: z.ZodError, jsonText: string): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];

  for (const issue of zodError.issues) {
    const position = findPositionFromPath(jsonText, issue.path);

    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: issue.message,
      startLineNumber: position.startLine,
      startColumn: position.startColumn,
      endLineNumber: position.endLine,
      endColumn: position.endColumn,
      source: 'zod-validation',
    });
  }

  return markers;
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
