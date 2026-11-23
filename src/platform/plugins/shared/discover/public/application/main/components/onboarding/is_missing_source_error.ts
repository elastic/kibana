/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MISSING_SOURCE = /unknown index|unknown data source|index_not_found/i;

const readErrorText = (error: Error): string => {
  const withDetails = error as Error & {
    body?: { message?: string; attributes?: { error?: { type?: string; reason?: string } } };
    attributes?: { error?: { type?: string; reason?: string } };
  };
  const nested = withDetails.attributes?.error ?? withDetails.body?.attributes?.error;

  return [error.message, withDetails.body?.message, nested?.type, nested?.reason]
    .filter((part): part is string => Boolean(part))
    .join('\n');
};

/** True when an ES|QL error means the named source does not exist. */
export const isMissingSourceError = (error: Error | undefined): boolean =>
  Boolean(error && MISSING_SOURCE.test(readErrorText(error)));
