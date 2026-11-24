/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Replaces null values with a fallback value. For arrays, the function will be applied index-wise to each element and also replaces undefined elements, such as the value of a row that doesn't have the column.
 * @param {(any|any[])} a a value or an array of values that can include null
 * @param {(any)} b the value to use in place of null
 * @return {(any|any[])} `a` if it isn't null, otherwise `b`. Returns an array with `b` in place of each null or undefined element if `a` is an array.
 *
 * @example
 * defaults(5, 1) // returns 5
 * defaults(value, 1) // returns 1 if value is null
 * defaults(prices, 0) // returns [3, 0, 5] if prices is [3, null, 5]
 */

module.exports = { defaults };

function defaults(a, b) {
  if (Array.isArray(a)) {
    return a.map((v) => (v == null ? b : v));
  }
  return a == null ? b : a;
}

defaults.skipNumberValidation = true;
