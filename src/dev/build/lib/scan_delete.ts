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

import del from 'del';
import { join } from 'path';
import * as Rx from 'rxjs';
import { count, map, mergeAll, mergeMap } from 'rxjs/operators';

// @ts-ignore
import { assertAbsolute } from './fs';

const getStat$ = Rx.bindNodeCallback(Fs.stat);
const getReadDir$ = Rx.bindNodeCallback(Fs.readdir);

interface Options {
  directory: string;
  regularExpressions: RegExp[];
  concurrency?: 20;
}

/**
 * Scan the files in a directory and delete the directories/files that
 * are matched by an array of regular expressions.
 *
 * @param options.directory the directory to scan, all files including dot files will be checked
 * @param options.regularExpressions an array of regular expressions, if any matches the file/directory will be deleted
 * @param options.concurrency optional concurrency to run deletes, defaults to 20
 */
export async function scanDelete(options: Options) {
  const { directory, regularExpressions, concurrency = 20 } = options;

  assertAbsolute(directory);

  // get an observable of absolute paths within a directory
  const getChildPath$ = (path: string) =>
    getReadDir$(path).pipe(
      mergeAll(),
      map(name => join(path, name))
    );

  // get an observable of all paths to be deleted, by starting with the arg
  // and recursively iterating through all children, unless a child matches
  // one of the supplied regular expressions
  const getPathsToDelete$ = (path: string): Rx.Observable<string> => {
    if (regularExpressions.some(re => re.test(path))) {
      return Rx.of(path);
    }

    return getStat$(path).pipe(
      mergeMap(stat => (stat.isDirectory() ? getChildPath$(path) : Rx.EMPTY)),
      mergeMap(getPathsToDelete$)
    );
  };

  return await Rx.of(directory)
    .pipe(
      mergeMap(getPathsToDelete$),
      mergeMap(async path => await del(path), concurrency),
      count()
    )
    .toPromise();
}
