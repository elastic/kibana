/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import { SCHEDULED_INTERVAL_ERROR, SCHEDULED_INTERVAL_PATTERN } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { getPathAtOffset } from '../../../../common/lib/yaml';
import { enrichErrorMessage } from '../../../../common/lib/zod';

/**
 * Formats Monaco YAML validation markers with enriched error messages.
 * Uses schema-aware enrichment to provide helpful hints about expected values.
 */
export function formatMonacoYamlMarker(
  marker: monaco.editor.IMarkerData,
  editorModel: monaco.editor.ITextModel,
  workflowYamlSchemaLoose: z.ZodSchema,
  yamlDocument: YAML.Document | null
): monaco.editor.IMarkerData {
  const newMarker: monaco.editor.IMarkerData = {
    ...marker,
  };

  // Update severity for yaml-schema errors to make them more visible
  if (marker.source?.startsWith('yaml-schema:')) {
    newMarker.severity = monaco.MarkerSeverity.Error;
  }

  // JSON Schema `pattern` errors lose the Zod error message during conversion.
  // Match the pattern string from the schema source of truth and replace with
  // the original human-readable message.
  if (marker.message?.includes(SCHEDULED_INTERVAL_PATTERN.source)) {
    return {
      ...newMarker,
      message: SCHEDULED_INTERVAL_ERROR,
    };
  }

  // Check if this is a validation error that could benefit from enrichment
  if (!shouldEnrichMarker(marker.message)) {
    return newMarker;
  }

  try {
    // Get the YAML path at this marker position
    const yamlPath = yamlDocument
      ? getPathAtOffset(
          yamlDocument,
          editorModel.getOffsetAt({
            lineNumber: marker.startLineNumber,
            column: marker.startColumn,
          })
        )
      : [];

    // Use enrichment directly (no mock ZodErrors)
    const { message: enrichedMessage, enriched } = enrichErrorMessage(
      yamlPath,
      marker.message ?? '',
      'unknown', // Monaco YAML errors don't have Zod error codes
      {
        schema: workflowYamlSchemaLoose,
        yamlDocument: yamlDocument ?? undefined,
      }
    );

    if (enriched) {
      return {
        ...newMarker,
        message: enrichedMessage,
        relatedInformation: [],
      };
    }
  } catch {
    // Fallback to original message if enrichment fails
  }

  return newMarker;
}

/**
 * Determines if a marker message should be enriched.
 */
function shouldEnrichMarker(message: string | undefined): boolean {
  if (!message) return false;

  // Numeric enum patterns (e.g., "Expected 0 | 1 | 2")
  const hasNumericEnumPattern =
    /Expected "\d+(\s*\|\s*\d+)*"/.test(message) ||
    /Incorrect type\. Expected "\d+(\s*\|\s*\d+)*"/.test(message) ||
    /Expected \\\\"?\d+(\s*\|\s*\d+)*\\\\"?/.test(message) ||
    /Expected \d+(\s*\|\s*\d+)*(?!\w)/.test(message) ||
    /Invalid enum value\. Expected \d+(\s*\|\s*\d+)*/.test(message) ||
    /Value must be one of: \d+(\s*,\s*\d+)*/.test(message);

  // Field type errors (e.g., "Expected settings", "Expected connector")
  const hasFieldTypeError =
    /Incorrect type\. Expected "[a-zA-Z_][a-zA-Z0-9_]*"/.test(message) ||
    /Expected "[a-zA-Z_][a-zA-Z0-9_]*"/.test(message);

  // Connector enum patterns
  const hasConnectorEnumPattern = message.includes('Expected ".none" | ".cases-webhook"');

  return hasNumericEnumPattern || hasFieldTypeError || hasConnectorEnumPattern;
}
