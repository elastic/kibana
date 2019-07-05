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

import Fs from 'fs';

import { join } from 'path';
import * as Rx from 'rxjs';
import { map, mergeAll, mergeMap } from 'rxjs/operators';

// @ts-ignore
import { assertAbsolute } from './fs';

const getStat$ = Rx.bindNodeCallback(Fs.stat) as (path: string) => Rx.Observable<Fs.Stats>;
const getReadDir$ = Rx.bindNodeCallback(Fs.readdir) as (path: string) => Rx.Observable<string[]>;

/**
 * Return an observable of all files in a directory, starting with the
 * directory argument and including all of its children recursivly,
 * including dot files.
 *
 * @param directory the directory to scan
 */
export function scan$(directory: string) {
  // get an observable of absolute paths within a directory
  const getChildPath$ = (path: string) =>
    getReadDir$(path).pipe(
      mergeAll(),
      map((name: string) => join(path, name))
    );

  // get an observable for the argument paths and all of its child
  // paths if it is a path to a directory, recursively
  const getPaths$ = (path: string): Rx.Observable<string> => {
    return Rx.concat(
      [path],
      getStat$(path).pipe(
        mergeMap(stat => (stat.isDirectory() ? getChildPath$(path) : Rx.EMPTY)),
        mergeMap(getPaths$)
      )
    );
  };

  return getPaths$(directory);
}
