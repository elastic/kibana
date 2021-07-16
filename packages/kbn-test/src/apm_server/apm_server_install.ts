/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import execa from 'execa';
import { firstValueFrom } from '@kbn/std';
import { ToolingLog, observeLines, extract } from '@kbn/dev-utils';
import JsYaml from 'js-yaml';
import * as Rx from 'rxjs';
import { map, take, takeUntil, tap, ignoreElements, defaultIfEmpty } from 'rxjs/operators';

import { INSTALLS_DIR } from './paths';
import { ArchiveArtifact } from './archive_artifact';
import { compact } from './compact';
import { ApmServerProcess } from './apm_server_process';

const DEFAULT_ES_CONFIG = {
  hosts: ['localhost:9200'],
  username: 'elastic',
  password: 'changeme',
};

export interface ApmServerConfig {
  readonly port?: number;
  readonly elasticsearch?: {
    readonly hosts?: string[];
    readonly username?: string;
    readonly password?: string;
  };
}

export class ApmServerInstall {
  public readonly dir: string;
  constructor(
    private readonly log: ToolingLog,
    private readonly name: string,
    private readonly artifact: ArchiveArtifact
  ) {
    this.dir = Path.resolve(INSTALLS_DIR, this.name);
  }

  async extract() {
    this.log.debug('deleting previous install');
    await Fs.rm(this.dir, { recursive: true, force: true });

    this.log.debug('installing APM server from archive');
    await extract({
      archivePath: this.artifact.path,
      targetDir: this.dir,
      stripComponents: 1,
    });
  }

  async configureInstall(config?: ApmServerConfig) {
    this.log.debug('writing apm-server.yml');
    await Fs.writeFile(
      Path.resolve(this.dir, 'apm-server.yml'),
      JsYaml.safeDump(
        compact({
          'apm-server': {
            host: config?.port ? `localhost:${config.port}` : undefined,
            rum: {
              enabled: true,
              event_rate: {
                limit: 1000,
              },
              allow_origins: ['*'],
            },
          },
          output: {
            elasticsearch: config?.elasticsearch ?? DEFAULT_ES_CONFIG,
          },
        })
      )
    );
  }

  async run() {
    await this.exec({
      argv: ['run'],
      logLevel: 'info',
      shouldRunForever: true,
    });
  }

  start() {
    const ready$ = new Rx.Subject<void>();
    const stop$ = new Rx.Subject<void>();

    const promise = this.exec({
      argv: ['run'],
      logLevel: 'info',
      shouldRunForever: true,
      stopSignal: stop$,
      readyCb: () => ready$.next(),
    });

    const error$ = new Rx.Subject<Error>();
    promise.then(
      () => {
        error$.complete();
      },
      (error) => {
        error$.next(error);
        error$.complete();
      }
    );

    return new ApmServerProcess(error$, ready$, stop$);
  }

  private async exec(options: {
    argv: string[];
    logLevel?: 'info' | 'debug';
    shouldRunForever?: boolean;
    stopSignal?: Rx.Observable<void>;
    readyCb?: () => void;
  }) {
    const logLevel: 'info' | 'debug' = options.logLevel ?? 'debug';

    const proc = execa(`./${this.artifact.executableName}`, ['-e', ...options.argv], {
      cwd: this.dir,
      extendEnv: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const exit$ = Rx.fromEvent<[number, null] | [null, string]>(proc, 'exit').pipe(
      map((reason) => {
        if (reason[0] === null) {
          // killed with a signal
          const signal = reason[1];
          this.log[logLevel]('apm-server exitted because signal', signal, 'was sent');
          return;
        }

        const exitCode = reason[0];
        this.log[logLevel]('apm-server exitted with code', exitCode);

        if (options.shouldRunForever) {
          throw new Error(`apm-server unexpectedly exitted with code [${exitCode}]`);
        }

        if (exitCode > 0) {
          throw new Error(`apm-server exitted with code [${exitCode}]`);
        }
        return;
      }),
      take(1)
    );

    const kill$ = (options.stopSignal ?? Rx.NEVER).pipe(
      takeUntil(exit$),
      tap(() => {
        // tell the process to exit by sending it a 'SIGINT' signal
        proc.kill('SIGINT');
      }),
      ignoreElements()
    );

    const error$ = Rx.fromEvent<Error>(proc, 'error').pipe(
      takeUntil(exit$),
      map((error) => {
        throw error;
      })
    );

    const output$ = Rx.merge(observeLines(proc.stdout!), observeLines(proc.stderr!)).pipe(
      map((line) => {
        try {
          const parsed = JSON.parse(line);
          const lineWithoutLevel = `[${parsed['log.logger']}] ${parsed.message}`;
          const lineLevel: 'info' | 'debug' | 'error' = parsed['log.level'];
          const isKnownLevel = lineLevel === 'info' || lineLevel === 'debug';
          const useLineLevel = lineLevel === 'error' || (logLevel === 'info' && isKnownLevel);

          if (
            options.readyCb &&
            parsed['log.logger'] === 'beater' &&
            parsed.message.startWith('Listening on:')
          ) {
            options.readyCb();
          }

          return useLineLevel
            ? { level: lineLevel, line: lineWithoutLevel }
            : { level: logLevel, line: `[${lineLevel}] ${lineWithoutLevel}` };
        } catch {
          return { level: logLevel, line };
        }
      }),
      tap(({ level, line }) => {
        this.log[level](`[${this.name}] ${line}`);
      }),
      ignoreElements()
    );

    await firstValueFrom(Rx.merge(error$, output$, kill$).pipe(defaultIfEmpty()));
  }
}
