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
import type YAML from 'yaml';
import { getCurrentPath, formatValidationError } from '../../../../common/lib/yaml_utils';

export function getMonacoMarkerInterceptor(
  originalSetModelMarkers: any,
  workflowYamlSchemaLoose: z.ZodSchema,
  yamlDocumentRef: React.RefObject<YAML.Document | null>
) {
  return function (editorModel: any, owner: string, markers: any[]) {
    // Only process YAML validation markers

    // Only modify YAML validation markers
    if (owner === 'yaml') {
      const fixedMarkers = markers.map((marker) => {
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
        const hasConnectorEnumPattern = marker.message?.includes(
          'Expected ".none" | ".cases-webhook"'
        );

        // Process markers that match our patterns

        if (hasNumericEnumPattern || hasConnectorEnumPattern || hasFieldTypeError) {
          try {
            // Get the YAML path at this marker position to determine context
            const currentYamlDocument = yamlDocumentRef.current;
            let yamlPath: (string | number)[] = [];

            if (currentYamlDocument) {
              const markerPosition = editorModel.getOffsetAt({
                lineNumber: marker.startLineNumber,
                column: marker.startColumn,
              });
              yamlPath = getCurrentPath(currentYamlDocument, markerPosition);
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
              currentYamlDocument
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
      });

      // Call the original function with fixed markers
      return originalSetModelMarkers.call(monaco.editor, editorModel, owner, fixedMarkers);
    }

    // For non-YAML markers, call original function unchanged
    return originalSetModelMarkers.call(monaco.editor, editorModel, owner, markers);
  };
}
