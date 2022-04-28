/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { catchError, delay, finalize, first, map, mapTo, mergeMap, timeout } from 'rxjs/operators';

/**
 * Number of milliseconds we wait before we fall back to the default watch handler.
 */
const defaultHandlerDelay = 3000;

/**
 * If default watch handler is used, then it's the number of milliseconds we wait for
 * any build output before we consider watch task ready.
 */
const defaultHandlerReadinessTimeout = 2000;

/**
 * Describes configurable watch options.
 */
interface IWatchOptions {
  /**
   * Number of milliseconds to wait before we fall back to default watch handler.
   */
  handlerDelay?: number;

  /**
   * Number of milliseconds that default watch handler waits for any build output before
   * it considers initial build completed. If build process outputs anything in a given
   * time span, the timeout is restarted.
   */
  handlerReadinessTimeout?: number;
}

function getWatchHandlers(
  buildOutput$: Rx.Observable<string>,
  {
    handlerDelay = defaultHandlerDelay,
    handlerReadinessTimeout = defaultHandlerReadinessTimeout,
  }: IWatchOptions
) {
  const typescriptHandler = buildOutput$.pipe(
    first((data) => data.includes('$ tsc')),
    map(() =>
      buildOutput$.pipe(
        first((data) => data.includes('Compilation complete.')),
        mapTo('tsc')
      )
    )
  );

  const webpackHandler = buildOutput$.pipe(
    first((data) => data.includes('$ webpack')),
    map(() =>
      buildOutput$.pipe(
        first((data) => data.includes('Chunk Names')),
        mapTo('webpack')
      )
    )
  );

  const defaultHandler = Rx.of(undefined).pipe(
    delay(handlerReadinessTimeout),
    map(() =>
      buildOutput$.pipe(
        timeout(handlerDelay),
        catchError(() => Rx.of('timeout'))
      )
    )
  );

  return [typescriptHandler, webpackHandler, defaultHandler];
}

export function waitUntilWatchIsReady(stream: NodeJS.EventEmitter, opts: IWatchOptions = {}) {
  const buildOutput$ = new Rx.Subject<string>();
  const onDataListener = (data: Buffer) => buildOutput$.next(data.toString('utf-8'));
  const onEndListener = () => buildOutput$.complete();
  const onErrorListener = (e: Error) => buildOutput$.error(e);

  stream.once('end', onEndListener);
  stream.once('error', onErrorListener);
  stream.on('data', onDataListener);

  return Rx.firstValueFrom(
    Rx.race(getWatchHandlers(buildOutput$, opts)).pipe(
      mergeMap((whenReady) => whenReady),
      finalize(() => {
        stream.removeListener('data', onDataListener);
        stream.removeListener('end', onEndListener);
        stream.removeListener('error', onErrorListener);

        buildOutput$.complete();
      })
    )
  );
}
