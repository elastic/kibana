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
interface WatchOptions {
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
  }: WatchOptions
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
  opts: WatchOptions = {}
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
