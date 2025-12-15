/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const isNaNValue = (value: unknown): boolean => {
  return typeof value === 'number' && Number.isNaN(value);
};

export const hasValue = (value: unknown): boolean => {
  if (value == null || value === '' || isNaNValue(value)) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((v) => v != null && v !== '' && !isNaNValue(v));
  }
  return true;
};
