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

import { Observable, Subject } from 'rxjs';

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
  buildOutput$: Observable<string>,
  {
    handlerDelay = defaultHandlerDelay,
    handlerReadinessTimeout = defaultHandlerReadinessTimeout,
  }: IWatchOptions
) {
  const typescriptHandler = buildOutput$
    .first(data => data.includes('$ tsc'))
    .map(() =>
      buildOutput$
        .first(data => data.includes('Compilation complete.'))
        .mapTo('tsc')
    );

  const webpackHandler = buildOutput$
    .first(data => data.includes('$ webpack'))
    .map(() =>
      buildOutput$.first(data => data.includes('Chunk Names')).mapTo('webpack')
    );

  const defaultHandler = Observable.of(undefined)
    .delay(handlerReadinessTimeout)
    .map(() =>
      buildOutput$.timeout(handlerDelay).catch(() => Observable.of('timeout'))
    );

  return [typescriptHandler, webpackHandler, defaultHandler];
}

export function waitUntilWatchIsReady(
  stream: NodeJS.EventEmitter,
  opts: IWatchOptions = {}
) {
  const buildOutput$ = new Subject<string>();
  const onDataListener = (data: Buffer) =>
    buildOutput$.next(data.toString('utf-8'));
  const onEndListener = () => buildOutput$.complete();
  const onErrorListener = (e: Error) => buildOutput$.error(e);

  stream.once('end', onEndListener);
  stream.once('error', onErrorListener);
  stream.on('data', onDataListener);

  return Observable.race(getWatchHandlers(buildOutput$, opts))
    .mergeMap(whenReady => whenReady)
    .finally(() => {
      stream.removeListener('data', onDataListener);
      stream.removeListener('end', onEndListener);
      stream.removeListener('error', onErrorListener);

      buildOutput$.complete();
    })
    .toPromise();
}
