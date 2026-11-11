/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SKIP_WARNINGS = process.env.NODE_ENV === 'production';
const warnedMessages = new Set<string>();

const describeValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'object' && '$$typeof' in value) {
    return 'React node';
  }
  return typeof value;
};

const warnNonString = (value: unknown) => {
  if (SKIP_WARNINGS) return;
  const message = `AppMenu expected a string, received ${describeValue(value)}. Rendering empty.`;
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  // eslint-disable-next-line no-console
  console.warn(message, value);
};

export const asPlainText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  warnNonString(value);
  return '';
};

export const asOptionalPlainText = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (value === undefined) return undefined;
  warnNonString(value);
  return undefined;
};
