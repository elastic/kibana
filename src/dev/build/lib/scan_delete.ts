/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import del from 'del';
import { join } from 'path';
import * as Rx from 'rxjs';
import { count, map, mergeAll, mergeMap } from 'rxjs/operators';

// @ts-ignore
import { assertAbsolute } from './fs';

const getStat$ = Rx.bindNodeCallback<[Fs.PathLike], [Fs.Stats]>(Fs.stat);
const getReadDir$ = Rx.bindNodeCallback<[string], [string[]]>(Fs.readdir);

interface Options {
  directory: string;
  regularExpressions: RegExp[];
  concurrency?: 20;
  excludePaths?: string[];
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
  const { directory, regularExpressions, concurrency = 20, excludePaths } = options;

  assertAbsolute(directory);
  (excludePaths || []).forEach((excluded) => assertAbsolute(excluded));

  // get an observable of absolute paths within a directory
  const getChildPath$ = (path: string) =>
    getReadDir$(path).pipe(
      mergeAll(),
      map((name: string) => join(path, name))
    );

  // get an observable of all paths to be deleted, by starting with the arg
  // and recursively iterating through all children, unless a child matches
  // one of the supplied regular expressions
  const getPathsToDelete$ = (path: string): Rx.Observable<string> => {
    if (excludePaths && excludePaths.includes(path)) {
      return Rx.EMPTY;
    }

    if (regularExpressions.some((re) => re.test(path))) {
      return Rx.of(path);
    }

    return getStat$(path).pipe(
      mergeMap((stat) => (stat.isDirectory() ? getChildPath$(path) : Rx.EMPTY)),
      mergeMap(getPathsToDelete$)
    );
  };

  return await Rx.of(directory)
    .pipe(
      mergeMap(getPathsToDelete$),
      mergeMap(async (path) => await del(path), concurrency),
      count()
    )
    .toPromise();
}
