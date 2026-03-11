/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

/**
 * Normalises a value to a string array: single value or array → only string elements; empty or no strings → `['']`.
 * Returns `null` when the input is `null`.
 */
export function normaliseToStringArray(value: unknown): string[] | null {
  if (value === null) {
    return null;
  }
  const result = _.castArray(value).filter(_.isString);
  return _.isEmpty(result) ? [''] : result;
}
