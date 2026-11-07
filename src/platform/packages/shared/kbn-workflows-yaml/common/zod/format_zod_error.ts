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
    const resolvedIssue = resolveUnionIssue(issue);
    const issueWithReceived = resolvedIssue as typeof resolvedIssue & { received?: unknown };
    const messageForEnrichment =
      issueWithReceived.received !== undefined
        ? `${resolvedIssue.message} (received: "${issueWithReceived.received}")`
        : resolvedIssue.message;

    const { message: enrichedMessage } = enrichErrorMessage(
      resolvedIssue.path ?? [],
      messageForEnrichment,
      resolvedIssue.code,
      context
    );

    return {
      ...resolvedIssue,
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

interface IssueLike {
  code: string;
  message: string;
  path?: PropertyKey[];
  errors?: unknown;
}

/** Prefer the union branch with the fewest issues, then the deepest path. */
function resolveUnionIssue<T extends IssueLike>(issue: T): T {
  const branches = getUnionBranches(issue);
  if (!branches) {
    return issue;
  }

  const resolved = branches.map((branch) => branch.map(resolveUnionIssue));
  const bestBranch = resolved.reduce((best, branch) =>
    isBetterBranch(branch, best) ? branch : best
  );
  if (bestBranch.length === 0) {
    return issue;
  }

  const bestIssue = bestBranch.reduce((best, candidate) =>
    issuePath(candidate).length > issuePath(best).length ? candidate : best
  );
  if (issuePath(bestIssue).length === 0) {
    return issue;
  }

  return {
    ...bestIssue,
    path: [...issuePath(issue), ...issuePath(bestIssue)],
  } as T;
}

function getUnionBranches(issue: IssueLike): IssueLike[][] | null {
  if (issue.code !== 'invalid_union' || !Array.isArray(issue.errors) || issue.errors.length === 0) {
    return null;
  }
  return issue.errors as IssueLike[][];
}

function isBetterBranch(candidate: IssueLike[], current: IssueLike[]): boolean {
  if (candidate.length !== current.length) {
    return candidate.length < current.length;
  }
  const candidateDepth = candidate.reduce(
    (max, issue) => Math.max(max, issuePath(issue).length),
    0
  );
  const currentDepth = current.reduce((max, issue) => Math.max(max, issuePath(issue).length), 0);
  return candidateDepth > currentDepth;
}

function issuePath(issue: IssueLike): PropertyKey[] {
  return issue.path ?? [];
}
