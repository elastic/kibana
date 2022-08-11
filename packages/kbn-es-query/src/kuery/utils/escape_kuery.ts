/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow } from 'lodash';

/**
 * Escapes a Kuery node value to ensure that special characters, operators, and whitespace do not result in a parsing error or unintended
 * behavior when using the value as an argument for the `buildNode` function.
 */
export const escapeKuery = flow(escapeSpecialCharacters, escapeAndOr, escapeNot, escapeWhitespace);

// See the SpecialCharacter rule in kuery.peg
function escapeSpecialCharacters(str: string) {
  return str.replace(/[\\():<>"*]/g, '\\$&'); // $& means the whole matched string
}

// See the Keyword rule in kuery.peg
function escapeAndOr(str: string) {
  return str.replace(/(\s+)(and|or)(\s+)/gi, '$1\\$2$3');
}

function escapeNot(str: string) {
  return str.replace(/not(\s+)/gi, '\\$&');
}

// See the Space rule in kuery.peg
function escapeWhitespace(str: string) {
  return str.replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}
