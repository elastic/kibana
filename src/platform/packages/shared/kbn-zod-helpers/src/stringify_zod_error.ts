/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodError } from '@kbn/zod';
import type { $ZodIssue } from '@kbn/zod/core';

const MAX_ERRORS = 5;

export function stringifyZodError(err: ZodError<any>) {
  const errorMessages: string[] = [];

  const issues = err.issues;

  // Recursively traverse all issues
  while (issues.length > 0) {
    const issue = issues.shift()!;

    // If the issue is an invalid union, we need to traverse all issues in the
    // "errors" array (v4: errors is an array of issue arrays)
    if (issue.code === 'invalid_union' && 'errors' in issue) {
      issues.push(...(issue.errors as $ZodIssue[][]).flat());
      continue;
    }

    errorMessages.push(stringifyIssue(issue));
  }

  const extraErrorCount = errorMessages.length - MAX_ERRORS;
  if (extraErrorCount > 0) {
    errorMessages.splice(MAX_ERRORS);
    errorMessages.push(`and ${extraErrorCount} more`);
  }

  return errorMessages.join(', ');
}

function stringifyIssue(issue: $ZodIssue) {
  if (issue.path.length === 0) {
    return issue.message;
  }
  return `${issue.path.join('.')}: ${issue.message}`;
}
