import chalk from 'chalk';
import { Observable, Subject } from 'rxjs';

import { Project } from '../utils/project';
import { topologicallyBatchProjects } from '../utils/projects';
import { parallelizeBatches } from '../utils/parallelize';
import { Command } from './';

/**
 * Name of the script in the package/project package.json file to run during `kbn watch`.
 */
const watchScriptName = 'kbn:watch';

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

  const defaultHandler = Observable.of(void 0)
    .delay(defaultHandlerReadinessTimeout)
    .map(() =>
      buildOutput$
        .timeout(defaultHandlerDelay)
        .catch(() => Observable.of(void 0))
        .mapTo('timeout')
    );

  return [typescriptHandler, webpackHandler, defaultHandler];
}

function runScriptUntilWatchIsReady(project: Project) {
  const buildOutput$ = new Subject<string>();
  const onDataListener = (data: Buffer) =>
    buildOutput$.next(data.toString('utf-8'));
  const onEndListener = () => buildOutput$.complete();
  const onErrorListener = (e: Error) => buildOutput$.error(e);

  const stream = project.runScriptStreaming(watchScriptName);
  stream.stdout.once('end', onEndListener);
  stream.stdout.once('error', onErrorListener);
  stream.stdout.on('data', onDataListener);

  return Observable.race(getWatchHandlers(buildOutput$))
    .mergeMap(whenReady => whenReady)
    .finally(() => {
      stream.stdout.removeListener('data', onDataListener);
      stream.stdout.removeListener('end', onEndListener);
      stream.stdout.removeListener('error', onErrorListener);

      buildOutput$.complete();
    })
    .toPromise();
}

/**
 * Command that traverses through list of available projects/packages that have `kbn:watch` script in their
 * package.json files, groups them into topology aware batches and then processes theses batches one by one
 * running `kbn:watch` scripts in parallel within the same batch.
 *
 * Command internally relies on the fact that most of the build systems that are triggered by `kbn:watch`
 * will emit special "marker" once build/watch process is ready that we can use as completion condition for
 * the `kbn:watch` script and eventually for the entire batch. Currently we support completion "markers" for
 * `webpack` and `tsc` only, for the rest we rely on predefined timeouts.
 */
export const WatchCommand: Command = {
  name: 'watch',
  description: 'Runs `kbn:watch` script for every project.',

  async run(projects, projectGraph) {
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    await parallelizeBatches(batchedProjects, async pkg => {
      if (!pkg.hasScript(watchScriptName)) {
        return;
      }

      console.log(
        chalk.bold(`\n[${chalk.green(pkg.name)}] Running watch script.\n`)
      );

      const completionMarker = await runScriptUntilWatchIsReady(pkg);
      console.log(
        chalk.bold(
          `\n[${chalk.green(pkg.name)}] Watch is ready (${completionMarker}).\n`
        )
      );
    });
  },
};
