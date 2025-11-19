/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kebabCase } from 'lodash';

/** Converts a given string into a valid Elasticsearch index name. */
export const toValidIndexName = (str: string): string => {
  if (!str || str.trim() === '') {
    throw new Error('Input string must be non-empty');
  }

  // Start with kebabCase to handle most transformations
  let result = kebabCase(str);

  // Additional processing for ES index name requirements
  result = result
    // ES doesn't allow \, /, *, ?, ", <, >, |, comma, #, :
    .replace(/[\\/*?"<>|,#:]/g, '-')
    // Cannot start with -, _, +
    .replace(/^[-_+]/, '');

  // Remove trailing hyphens
  while (result.endsWith('-')) {
    result = result.slice(0, -1);
  }

  if (result.length === 0) {
    throw new Error('No valid characters in input string');
  }

  return result;
};
