/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { words } from 'lodash';

/**
 * @name {string} the name of the configuration object
 * @returns {string} a space delimited, lowercase string with
 *          special characters removed.
 *
 * Example: 'xPack:fooBar:foo_bar_baz' -> 'x pack foo bar foo bar baz'
 */
export function getAriaName(name?: string) {
  return words(name || '')
    .map((word) => word.toLowerCase())
    .join(' ');
}
