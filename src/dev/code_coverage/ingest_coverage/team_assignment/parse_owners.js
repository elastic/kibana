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

import { fromEvent } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';
import { lineRead, pathAndTeams, empties, comments, dropCCDelim } from './parse_owners_helpers';
import { pipe } from '../utils';

const mutate = (xs) => (x) => xs.push(x);
export const parse = (codeOwnersPath) => (log) => (enumerationF) => (flushF) => {
  const cleanAndParse = pipe(dropCCDelim, pathAndTeams);
  const allLines$ = (lineReader) =>
    fromEvent(lineReader, 'line').pipe(
      filter(empties),
      filter(comments),
      map(cleanAndParse),
      takeUntil(fromEvent(lineReader, 'close'))
    );

  const rl = lineRead(codeOwnersPath);
  const data = [];
  const mutateData = mutate(data);
  allLines$(rl).subscribe(
    mutateData,
    (e) => log.error(e),
    () => {
      log.verbose(`\n### Parsing [${codeOwnersPath}] Complete`);
      // TODO: Maybe change this pipe such that the log object is not passed twice.
      pipe(enumerationF(log), flushF(log))(new Map(data));
    }
  );
};
