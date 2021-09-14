/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromEvent } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';
import { lineRead, pathAndTeams, dropCCDelim } from './parse_owners_helpers';
import { pipe } from '../utils';

const allLines$ = (lineReader) =>
  fromEvent(lineReader, 'line').pipe(
    filter(function dropEmptiesAndDropComments(x) {
      return x !== '' && !/^#\s{1,3}/.test(x);
    }),
    map(pipe(dropCCDelim, pathAndTeams)),
    takeUntil(fromEvent(lineReader, 'close'))
  );

export const parse = (codeOwnersPath) => allLines$(lineRead(codeOwnersPath));
