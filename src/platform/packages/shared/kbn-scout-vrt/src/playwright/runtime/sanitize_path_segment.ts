/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const trimSanitizedSegment = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength).replace(/_+$/g, '');
};

export const sanitizePathSegment = (value: string, fallback: string, maxLength = 80): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return trimSanitizedSegment(sanitized || fallback, maxLength) || fallback;
};
