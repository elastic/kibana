/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { fromEvent } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';
import { lineRead, pathAndTeams, empties, comments, dropCCDelim } from './parse_owners_helpers';
import { pipe } from '../utils';

const cleanAndParse = pipe(dropCCDelim, pathAndTeams);

const allLines$ = (lineReader) =>
  fromEvent(lineReader, 'line').pipe(
    filter(empties),
    filter(comments),
    map(cleanAndParse),
    takeUntil(fromEvent(lineReader, 'close'))
  );

export const parse = (codeOwnersPath) => allLines$(lineRead(codeOwnersPath));
