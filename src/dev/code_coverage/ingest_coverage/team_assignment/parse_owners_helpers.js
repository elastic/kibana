/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { always, id, pipe } from '../utils';
import * as Either from '../either';
import readline from 'readline';
import { createReadStream } from 'fs';
import { pluckIndex } from '../transforms';

const coverageDelimRe = /^#CC#\s/;

export const empties = (x) => x !== '';
export const comments = (x) => !/^#\s{1,3}/.test(x);
const dropDelim = (x) => () => x.replace(coverageDelimRe, '');

export const dropCCDelim = (x) =>
  Either.fromNullable(coverageDelimRe.test(x)).fold(always(x), id(dropDelim(x)));

const splitFilter = (splitter) => (x) => x.split(splitter).filter(empties);
const spaceSplit = splitFilter(' ');
const esSplit = splitFilter('@elastic/');
const getFirst = pluckIndex(0);
const trimEsGrabFirst = pipe(esSplit, getFirst);

export const pathAndTeams = (x) => {
  const [path, ...teamEntries] = spaceSplit(x);
  const teams = teamEntries.map(trimEsGrabFirst);

  return [path, teams];
};

export const lineRead = (x) => readline.createInterface({ input: createReadStream(x) });
