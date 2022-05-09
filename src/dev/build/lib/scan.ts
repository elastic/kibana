/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import { join } from 'path';
import * as Rx from 'rxjs';
import { map, mergeAll, mergeMap } from 'rxjs/operators';

// @ts-ignore
import { assertAbsolute } from './fs';

const getStat$ = Rx.bindNodeCallback<[string], [Fs.Stats]>(Fs.stat);
const getReadDir$ = Rx.bindNodeCallback<[string], [string[]]>(Fs.readdir);

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
        mergeMap((stat) => (stat.isDirectory() ? getChildPath$(path) : Rx.EMPTY)),
        mergeMap(getPaths$)
      )
    );
  };

  return getPaths$(directory);
}
