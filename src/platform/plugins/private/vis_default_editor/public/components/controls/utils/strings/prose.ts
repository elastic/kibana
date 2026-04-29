/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 *  Converts an array of items into a sentence-ready string.
 *
 *  @param {Array<string>} list
 *  @param {Object} [options={}]
 *  @property {Boolean} [options.inclusive=true] Creates an inclusive list using "and"
 *                                               when `true` (default), otherwise uses "or"
 *  @return {String}
 */
export function formatListAsProse(list: string[], options: { inclusive?: boolean } = {}) {
  const { inclusive = true } = options;
  const count = list.length;
  const conjunction = inclusive ? 'and' : 'or';

  if (count <= 2) {
    return list.join(` ${conjunction} `);
  }

  return list
    .slice(0, -1)
    .concat(`${conjunction} ${list[count - 1]}`)
    .join(', ');
}
