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

function getWatchHandlers(buildOutput$: Observable<string>) {
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
    .delay(defaultHandlerReadinessTimeout)
    .map(() =>
      buildOutput$
        .timeout(defaultHandlerDelay)
        .catch(() => Observable.of('timeout'))
    );

  return [typescriptHandler, webpackHandler, defaultHandler];
}

export function waitUntilWatchIsReady(stream: NodeJS.EventEmitter) {
  const buildOutput$ = new Subject<string>();
  const onDataListener = (data: Buffer) =>
    buildOutput$.next(data.toString('utf-8'));
  const onEndListener = () => buildOutput$.complete();
  const onErrorListener = (e: Error) => buildOutput$.error(e);

  stream.once('end', onEndListener);
  stream.once('error', onErrorListener);
  stream.on('data', onDataListener);

  return Observable.race(getWatchHandlers(buildOutput$))
    .mergeMap(whenReady => whenReady)
    .finally(() => {
      stream.removeListener('data', onDataListener);
      stream.removeListener('end', onEndListener);
      stream.removeListener('error', onErrorListener);

      buildOutput$.complete();
    })
    .toPromise();
}
