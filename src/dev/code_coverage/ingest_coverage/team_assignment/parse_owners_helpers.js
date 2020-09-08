/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
