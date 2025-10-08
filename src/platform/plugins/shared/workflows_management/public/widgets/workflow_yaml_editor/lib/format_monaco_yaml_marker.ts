/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { z } from '@kbn/zod';
import type YAML from 'yaml';
import { getCurrentPath, formatValidationError } from '../../../../common/lib/yaml_utils';

export function formatMonacoYamlMarker(
  marker: monaco.editor.IMarker | monaco.editor.IMarkerData,
  editorModel: monaco.editor.ITextModel,
  workflowYamlSchemaLoose: z.ZodSchema,
  yamlDocument: YAML.Document | null
) {
  // // Apply custom formatting to schema validation errors (from monaco-yaml)
  // if (owner === 'yaml' && marker.message) {
  //   // Extract the actual value from the editor at the error position
  //   const model = editor.getModel();
  //   let receivedValue: string | undefined;

  //   if (model) {
  //     try {
  //       // Get the text at the error position
  //       const range = {
  //         startLineNumber: marker.startLineNumber,
  //         startColumn: marker.startColumn,
  //         endLineNumber: marker.endLineNumber || marker.startLineNumber,
  //         endColumn: marker.endColumn || marker.startColumn + 10, // fallback range
  //       };

  //       const textAtError = model.getValueInRange(range);

  //       // Try to extract the value (remove quotes if present)
  //       const valueMatch = textAtError.match(/^\s*([^:\s]+)/);
  //       if (valueMatch) {
  //         receivedValue = valueMatch[1].replace(/['"]/g, '');
  //       }
  //     } catch (e) {
  //       // Fallback to parsing the message
  //       receivedValue = extractReceivedValue(marker.message);
  //     }
  //   }

  //   // Create a mock error object that matches our formatter's expected structure
  //   const mockError: MockZodError = {
  //     message: marker.message,
  //     issues: [
  //       {
  //         code: marker.message.includes('Value must be') ? 'invalid_literal' : 'unknown',
  //         message: marker.message,
  //         path: ['type'], // Assume it's a type field error for now
  //         received: receivedValue ?? '',
  //       },
  //     ],
  //   };

  //   const { message } = formatValidationError(mockError, workflowYamlSchema);
  //   formattedMessage = message;
  // }
  // Check if this is a validation error that could benefit from dynamic formatting
  const hasNumericEnumPattern =
    // Patterns with quotes: Expected "0 | 1 | 2"
    /Expected "\d+(\s*\|\s*\d+)*"/.test(marker.message || '') ||
    /Incorrect type\. Expected "\d+(\s*\|\s*\d+)*"/.test(marker.message || '') ||
    // Patterns with escaped quotes: Expected \"0 | 1\"
    /Expected \\\\"?\d+(\s*\|\s*\d+)*\\\\"?/.test(marker.message || '') ||
    // Patterns without quotes: Expected 0 | 1
    /Expected \d+(\s*\|\s*\d+)*(?!\w)/.test(marker.message || '') ||
    // Additional patterns for different Monaco YAML error formats
    /Invalid enum value\. Expected \d+(\s*\|\s*\d+)*/.test(marker.message || '') ||
    /Value must be one of: \d+(\s*,\s*\d+)*/.test(marker.message || '');

  // Check for field type errors (like "Expected settings", "Expected connector", etc.)
  const hasFieldTypeError =
    /Incorrect type\. Expected "[a-zA-Z_][a-zA-Z0-9_]*"/.test(marker.message || '') ||
    /Expected "[a-zA-Z_][a-zA-Z0-9_]*"/.test(marker.message || '');

  // Also check for the current message pattern we're seeing
  const hasConnectorEnumPattern = marker.message?.includes('Expected ".none" | ".cases-webhook"');

  // Process markers that match our patterns

  if (hasNumericEnumPattern || hasConnectorEnumPattern || hasFieldTypeError) {
    try {
      // Get the YAML path at this marker position to determine context
      let yamlPath: (string | number)[] = [];

      if (yamlDocument) {
        const markerPosition = editorModel.getOffsetAt({
          lineNumber: marker.startLineNumber,
          column: marker.startColumn,
        });
        yamlPath = getCurrentPath(yamlDocument, markerPosition);
      }

      // Create a mock Zod error with the path information
      const mockZodError = {
        issues: [
          {
            code: 'unknown' as const,
            path: yamlPath,
            message: marker.message,
            received: 'unknown',
          },
        ],
      };

      // Use the dynamic formatValidationError with schema and YAML document
      const { message: formattedMessage } = formatValidationError(
        mockZodError as any,
        workflowYamlSchemaLoose,
        yamlDocument ?? undefined
      );

      // Return the marker with the improved message

      return {
        ...marker,
        message: formattedMessage,
      };
    } catch (error) {
      // Fallback to original message if dynamic formatting fails
      return marker;
    }
  }
  return marker;
}

// // Helper function to extract the received value from Monaco's error message
// function extractReceivedValue(message: string): string | undefined {
//   // Try different patterns to extract the received value

//   // Pattern 1: "Value must be one of: ... Received: 'value'"
//   let receivedMatch = message.match(/Received:\s*['"]([^'"]+)['"]/);
//   if (receivedMatch) {
//     return receivedMatch[1];
//   }

//   // Pattern 2: "Value must be one of: ... Received: value" (without quotes)
//   receivedMatch = message.match(/Received:\s*([^\s,]+)/);
//   if (receivedMatch) {
//     return receivedMatch[1];
//   }

//   // Pattern 3: Look for the actual value in the editor at the error position
//   // This is more complex but might be needed if Monaco doesn't include the value in the message

//   // For now, return undefined if we can't extract it
//   return undefined;
// }
