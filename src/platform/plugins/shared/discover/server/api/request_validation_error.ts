/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ZodError, type z } from '@kbn/zod';
import type { OnRequestValidationError } from '@kbn/core-http-server';

type Issue = z.core.$ZodIssue;

const TAB_DISCRIMINATORS = ['type', 'data_source.type'];
const ARRAY_ITEM_LABELS: Readonly<Record<string, string>> = {
  tabs: 'Tab',
  control_panels: 'control',
};

const isTabPath = (path: Issue['path']) =>
  path.length === 2 && path[0] === 'tabs' && typeof path[1] === 'number';

// Keeps the only tab branch without discriminator errors.
const selectTabBranch = (issue: Issue): Issue[] => {
  if (issue.code !== 'invalid_union' || !isTabPath(issue.path)) {
    return [issue];
  }

  const matching = issue.errors.filter(
    (branch) => !branch.some(({ path }) => TAB_DISCRIMINATORS.includes(path.join('.')))
  );

  if (matching.length !== 1) {
    return [issue];
  }

  return matching[0].map((nested) => ({ ...nested, path: [...issue.path, ...nested.path] }));
};

// Shows list items as "Tab 2" or "control 1" and keeps field names as they appear in the request
const formatPath = (path: Issue['path']) =>
  path
    .flatMap((segment, index) => {
      if (typeof path[index + 1] === 'number') {
        return [];
      }

      if (typeof segment !== 'number') {
        return String(segment);
      }

      const arrayName = String(path[index - 1] ?? 'item');

      return `${ARRAY_ITEM_LABELS[arrayName] ?? arrayName} ${segment + 1}`;
    })
    .join(', ');

const formatIssue = ({ path, code, message }: Issue) => {
  const description =
    code === 'invalid_union' && isTabPath(path)
      ? 'Invalid tab configuration. Check the tab type, data source, and settings.'
      : message;
  const location = formatPath(path);

  return location ? `${location}: ${description}` : description;
};

/** Formats request validation errors and preserves the original issues as attributes. */
export const onRequestValidationError: OnRequestValidationError = (
  { message, rawError },
  _request,
  response
) => {
  if (!(rawError instanceof ZodError)) {
    return response.badRequest({ body: { message } });
  }

  const issues = rawError.issues.flatMap(selectTabBranch);

  return response.badRequest({
    body: {
      message: issues.map(formatIssue).join('\n'),
      attributes: { issues: rawError.issues },
    },
  });
};
