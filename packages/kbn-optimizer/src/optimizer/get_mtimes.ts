/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import * as Rx from 'rxjs';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { allValuesFrom } from '../common';

const stat$ = Rx.bindNodeCallback<Fs.PathLike, Fs.Stats>(Fs.stat);

/**
 * get mtimes of referenced paths concurrently, limit concurrency to 100
 */
export async function getMtimes(paths: Iterable<string>) {
  return new Map(
    await allValuesFrom(
      Rx.from(paths).pipe(
        // map paths to [path, mtimeMs] entries with concurrency of
        // 100 at a time, ignoring missing paths
        mergeMap(
          (path) =>
            stat$(path).pipe(
              map((stat) => [path, stat.mtimeMs] as const),
              catchError((error: any) =>
                error?.code === 'ENOENT' ? Rx.EMPTY : Rx.throwError(error)
              )
            ),
          100
        )
      )
    )
  );
}
