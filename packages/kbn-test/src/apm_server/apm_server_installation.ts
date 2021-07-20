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
import { ToolingLog, observeLines, extract } from '@kbn/dev-utils';
import JsYaml from 'js-yaml';
import * as Rx from 'rxjs';
import { map, mergeMap, take, takeUntil, tap, defaultIfEmpty, share } from 'rxjs/operators';

import { INSTALLS_DIR } from './paths';
import { ArchiveArtifact } from './archive_artifact';
import { compact } from './compact';
import { ApmServerProcess } from './apm_server_process';

type KnownLogLevel = 'info' | 'debug' | 'error';
interface LogLine {
  level: KnownLogLevel;
  line: string;
}

export type StopSignal = 'SIGINT' | 'SIGKILL';
export type StopSubject = Rx.Subject<StopSignal | undefined>;

export type ExecState =
  | { readonly type: 'starting' }
  | { readonly type: 'ready' }
  | { readonly type: 'error'; error: Error }
  | { readonly type: 'exitted'; exitCode: number; shouldRunForever: boolean }
  | { readonly type: 'killed'; signal: string };

const READY_STATE: ExecState = Object.freeze({
  type: 'ready',
});

const STARTING_STATE: ExecState = Object.freeze({
  type: 'starting',
});

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

export class ApmServerInstallation {
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

  run(options: { shouldRunForever?: boolean }) {
    const state$ = new Rx.BehaviorSubject<ExecState>(STARTING_STATE);
    const stop$: StopSubject = new Rx.Subject();

    let signalSent: StopSignal | undefined;

    const proc = execa(`./${this.artifact.executableName}`, ['-e', 'run'], {
      cwd: this.dir,
      extendEnv: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const exit$ = Rx.fromEvent<[number, null] | [null, string]>(proc, 'exit').pipe(
      map((reason) => {
        if (reason[0] === null || signalSent) {
          // killed with a signal
          const signal = reason[1] ?? signalSent!;
          this.log.info(`[${this.name}] process exitted because signal`, signal, 'was sent');
          state$.next({ type: 'killed', signal });
          return;
        }

        const exitCode = reason[0];
        this.log.info(`[${this.name}] process exitted with code`, exitCode);
        state$.next({ type: 'exitted', exitCode, shouldRunForever: !!options.shouldRunForever });
      }),
      take(1),
      share()
    );

    // tell the process to exit by sending it a 'SIGINT' signal
    const kill$ = stop$.pipe(
      mergeMap((signal, i) =>
        signal === 'SIGINT' || (signal === undefined && i === 0)
          ? // send SIGINT with a 15 second timeout before sending SIGKILL
            Rx.merge(
              Rx.of('SIGINT' as StopSignal),
              Rx.timer(15000).pipe(map((): StopSignal => 'SIGKILL'))
            )
          : // send SIGKILL
            Rx.of('SIGKILL' as StopSignal)
      ),
      takeUntil(exit$),
      tap((signal) => {
        signalSent = signal;
        proc.kill(signal);
      })
    );

    const error$ = Rx.fromEvent<Error>(proc, 'error').pipe(
      takeUntil(exit$),
      map((error) => {
        throw error;
      })
    );

    const output$ = Rx.merge(observeLines(proc.stdout!), observeLines(proc.stderr!)).pipe(
      map(
        (line): LogLine => {
          try {
            const parsed = JSON.parse(line);
            const lineWithoutLevel = `[${parsed['log.logger']}] ${parsed.message}`;
            const level: KnownLogLevel = parsed['log.level'];
            const isKnownLevel = level === 'info' || level === 'debug' || level === 'error';

            return isKnownLevel
              ? { level, line: lineWithoutLevel }
              : { level: 'info', line: `[${level}] ${lineWithoutLevel}` };
          } catch {
            return { level: 'info', line };
          }
        }
      ),
      tap(({ level, line }) => {
        this.log[level](`[${this.name}] ${line}`);

        // if we get a "listening on" log line while were in a "starting" state
        // transition to the "ready" state
        if (state$.getValue().type === 'starting' && line.startsWith('[beater] Listening on:')) {
          state$.next(READY_STATE);
        }
      })
    );

    Rx.merge(error$, output$, kill$)
      .pipe(defaultIfEmpty())
      .subscribe({
        error: (error) => {
          state$.next({ type: 'error', error });
        },
      });

    return new ApmServerProcess(state$, stop$);
  }
}
