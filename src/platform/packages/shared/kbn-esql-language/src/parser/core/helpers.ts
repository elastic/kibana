/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const nonNullable = <T>(v: T): v is NonNullable<T> => {
  return v != null;
};

/**
 * Removes backtick quotes from around a field name and un-escapes any
 * backticks (double ``) within the field name.
 *
 * @param field A potentially escaped field (column).
 */
export const unescapeColumn = (field: string) => {
  if (!field) {
    return '';
  }

  return field.replace(/^`{1}|`{1}$/g, '').replace(/``/g, '`');
};
