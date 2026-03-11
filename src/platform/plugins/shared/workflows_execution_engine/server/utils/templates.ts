/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function isTemplateExpression(expression: string | unknown): expression is `{{${string}}}` {
  return typeof expression === 'string' && expression.startsWith('{{') && expression.endsWith('}}');
}

/**
 * Returns true when `value` is a string that is exactly one template expression
 * (e.g. `{{ steps.x }}`) with no leading or trailing literal text.
 * Use when deciding whether to preserve resolved type instead of stringifying.
 */
export function isSingleTemplateExpression(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  return (
    trimmed.length >= 4 &&
    trimmed.startsWith('{{') &&
    trimmed.endsWith('}}') &&
    trimmed.lastIndexOf('}}') === trimmed.length - 2
  );
}
