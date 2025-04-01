/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import * as Rx from 'rxjs';

import { makeMatcher, MatchOptions } from '@kbn/picomatcher';
import { assertAbsolute, fsReadDir$ } from './fs';

interface Options {
  /**
   * array of micromatch patterns, all relative paths within `directory`
   * will be checked against these patterns. If any matches (and none of
   * the negative patterns match) then that directory/file will be deleted
   * recursively.
   */
  match: string[];

  /**
   * Options for customizing how match patterns are applied (see micromatch docs)
   */
  matchOptions?: MatchOptions;

  /**
   * optional concurrency to run deletes, defaults to 20
   */
  concurrency?: number;
}

/**
 * Scan the files in a directory and delete the directories/files that
 * are matched by an array of regular expressions.
 *
 * @param directory the directory to scan and find files/folders that should be deleted
 */
export async function scanDelete(directory: string, options: Options) {
  assertAbsolute(directory);
  const matcher = makeMatcher(options.match, options.matchOptions);

  // get an observable of all paths to be deleted, by starting with the arg
  // and recursively iterating through all children, once a child matches
  // is will be recursively deleted and we will no longer iterate from down
  // that path
  const getPathsToDelete$ = (path: string): Rx.Observable<string> =>
    fsReadDir$(path).pipe(
      Rx.mergeAll(),
      Rx.mergeMap((ent) => {
        const abs = Path.resolve(path, ent.name);
        const rel = Path.relative(directory, abs);
        if (matcher(rel)) {
          return Rx.of(abs);
        }

        return ent.isDirectory() ? getPathsToDelete$(abs) : Rx.EMPTY;
      })
    );

  return await Rx.lastValueFrom(
    getPathsToDelete$(directory).pipe(
      Rx.mergeMap(
        async (path) => await Fsp.rm(path, { recursive: true, maxRetries: 1 }),
        options.concurrency
      ),
      Rx.count()
    )
  );
}
