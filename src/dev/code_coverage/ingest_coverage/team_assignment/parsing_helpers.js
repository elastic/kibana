/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { always } from '../utils';
import * as Either from '../either';

const coverageDelimRe = /^#CC#\s/;

export const empties = (x) => x !== '';
export const comments = (x) => !/^#\s{1,3}/.test(x);
const dropDelim = (x) => x.replace(coverageDelimRe, '');

export const dropCCDelim = (x) =>
  Either.fromNullable(coverageDelimRe.test(x)).fold(always(x), always(dropDelim(x)));
