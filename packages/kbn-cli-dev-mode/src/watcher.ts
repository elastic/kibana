/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import Pw from '@parcel/watcher';
import { REPO_ROOT } from '@kbn/repo-info';
import { RepoSourceClassifier } from '@kbn/repo-source-classifier';
import { ImportResolver } from '@kbn/import-resolver';
import { makeMatcher } from '@kbn/picomatcher';

import { Log } from './log';

const packageMatcher = makeMatcher(['**/*', '!**/.*']);

/**
 * Any non-package code must match this in order to trigger a restart
 */
const nonPackageMatcher = makeMatcher([
  'src/**',
  '!src/{dev,fixtures}/**',
  'x-pack/plugins/**',
  '!x-pack/plugins/screenshotting/chromium/**/*',
  '!x-pack/plugins/canvas/shareable_runtime/**/*',
]);

export interface Options {
  enabled: boolean;
  log: Log;
  repoRoot: string;
}

export class Watcher {
  public readonly enabled: boolean;

  private readonly log: Log;
  private readonly repoRoot: string;
  private readonly classifier: RepoSourceClassifier;
  private readonly restart$ = new Rx.Subject<void>();
  private readonly resolver: ImportResolver;

  constructor(options: Options) {
    this.enabled = !!options.enabled;
    this.log = options.log;
    this.repoRoot = options.repoRoot;
    this.resolver = ImportResolver.create(REPO_ROOT);
    this.classifier = new RepoSourceClassifier(this.resolver);
  }

  run$ = new Rx.Observable((subscriber) => {
    if (!this.enabled) {
      this.restart$.complete();
      subscriber.complete();
      return;
    }

    const fire = (repoRel: string) => {
      this.log.warn(`restarting server`, `due to changes in ${repoRel}`);
      this.restart$.next();
    };

    Pw.subscribe(
      this.repoRoot,
      (error, events) => {
        if (error) {
          subscriber.error(error);
          return;
        }

        for (const event of events) {
          const pkg = this.resolver.getPackageManifestForPath(event.path);

          // ignore changes in any devOnly package, these can't power the server so we can ignore them
          if (pkg?.devOnly) {
            return;
          }

          const result = this.classifier.classify(event.path);
          if (result.type === 'common package' || result.type === 'server package') {
            return packageMatcher(result.repoRel) && fire(result.repoRel);
          }
          if (result.type === 'non-package') {
            return nonPackageMatcher(result.repoRel) && fire(result.repoRel);
          }
        }
      },
      {
        // some basic high-level ignore statements. Additional filtering is done above
        // before paths are passed to `fire()`, using the RepoSourceClassifier mostly
        ignore: [
          '**/{node_modules,target,public,coverage,__*__}/**',
          '**/*.{test,spec,story,stories}.*',
          '**/*.{md,sh,txt}',
          '**/debug.log',
        ],
      }
    ).then(
      (sub) => {
        this.log.good('watching server files for changes');
        subscriber.add(() => {
          sub.unsubscribe();
        });
      },
      (error) => {
        subscriber.error(error);
      }
    );

    // complete state subjects when run$ completes
    subscriber.add(() => {
      this.restart$.complete();
    });
  });

  serverShouldRestart$() {
    return this.restart$.asObservable();
  }
}
