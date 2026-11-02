/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { z } from '@kbn/zod/v4';
import type { ConnectorParamsSchemaResolver } from './enrich_error_message';
import { enrichErrorMessage } from './enrich_error_message';
import type { FormattedZodError, MockZodError } from '../errors/invalid_yaml_schema';

interface FormatZodErrorResult {
  message: string;
  formattedError: FormattedZodError;
}

export interface FormatZodErrorOptions {
  /** Optional workflow schema for enhanced error messages */
  schema?: z.ZodType;
  /** Optional parsed YAML document for step type lookups */
  yamlDocument?: Document;
  /** Optional resolver for connector-specific params schemas (injected from the host plugin) */
  connectorParamsSchemaResolver?: ConnectorParamsSchemaResolver;
}

/**
 * Formats Zod validation errors into user-friendly messages.
 * Uses schema-aware enrichment to provide helpful hints about expected values.
 */
export function formatZodError(
  error: z.ZodError | MockZodError,
  options: FormatZodErrorOptions = {}
): FormatZodErrorResult {
  // If it's not a Zod error structure, return as-is
  if (!error?.issues || !Array.isArray(error.issues)) {
    const message = error?.message || String(error);
    return { message, formattedError: error };
  }

  const { schema, yamlDocument, connectorParamsSchemaResolver } = options;
  const context = { schema, yamlDocument, connectorParamsSchemaResolver };

  const formattedIssues = error.issues.map((issue) => {
    // Build a message that includes 'received' when available, so enrichment
    // can extract the actual value (e.g. for invalid_literal connector types)
    const issueWithReceived = issue as typeof issue & { received?: unknown };
    const messageForEnrichment =
      issueWithReceived.received !== undefined
        ? `${issue.message} (received: "${issueWithReceived.received}")`
        : issue.message;

    const { message: enrichedMessage } = enrichErrorMessage(
      issue.path ?? [],
      messageForEnrichment,
      issue.code,
      context
    );

    return {
      ...issue,
      message: enrichedMessage,
    };
  });

  const formattedError = {
    ...error,
    issues: formattedIssues,
    message: formattedIssues.map((i) => i.message).join(', '),
  };

  return {
    message: formattedError.message,
    formattedError: formattedError as FormattedZodError,
  };
}
