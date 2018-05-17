import execa from 'execa';
import { statSync } from 'fs';

import Rx from 'rxjs/Rx';
import { gray } from 'chalk';

import treeKill from 'tree-kill';
import { promisify } from 'util';
const treeKillAsync = promisify(treeKill);

import { observeLines } from './observe_lines';
import { createCliError } from './errors';

const SECOND = 1000;
const STOP_TIMEOUT = 30 * SECOND;

async function withTimeout(attempt, ms, onTimeout) {
  const TIMEOUT = Symbol('timeout');
  try {
    await Promise.race([
      attempt(),
      new Promise((resolve, reject) => setTimeout(
        () => reject(TIMEOUT),
        STOP_TIMEOUT
      ))
    ]);
  } catch (error) {
    if (error === TIMEOUT) {
      await onTimeout();
    } else {
      throw error;
    }
  }
}

export function createProc(name, { cmd, args, cwd, env, stdin, log }) {
  log.info('[%s] > %s', name, cmd, args.join(' '));

  // spawn fails with ENOENT when either the
  // cmd or cwd don't exist, so we check for the cwd
  // ahead of time so that the error is less ambiguous
  try {
    if (!statSync(cwd).isDirectory()) {
      throw new Error(`cwd "${cwd}" exists but is not a directory`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`cwd "${cwd}" does not exist`);
    }
  }

  const childProcess = execa(cmd, args, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (stdin) {
    childProcess.stdin.end(stdin, 'utf8');
  } else {
    childProcess.stdin.end();
  }

  return new class Proc {
    name = name;

    lines$ = Rx.Observable.merge(
      observeLines(childProcess.stdout),
      observeLines(childProcess.stderr)
    )
      .do(line => log.write(` ${gray('proc')}  [${gray(name)}] ${line}`))
      .share();

    outcome$ = Rx.Observable.defer(() => {
      // observe first exit event
      const exit$ = Rx.Observable.fromEvent(childProcess, 'exit')
        .take(1)
        .map(code => {
          // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat then as errors
          if (code > 0 && !(code === 143 || code === 130)) {
            throw createCliError(`[${name}] exited with code ${code}`);
          }

          return code;
        });

      // observe first error event until there is a close event
      const error$ = Rx.Observable.fromEvent(childProcess, 'error')
        .take(1)
        .mergeMap(err => Rx.Observable.throw(err));

      return Rx.Observable.race(exit$, error$);
    }).share()

    _outcomePromise = Rx.Observable.merge(
      this.lines$.ignoreElements(),
      this.outcome$
    ).toPromise();

    getOutcomePromise() {
      return this._outcomePromise;
    }

    async stop(signal) {
      await withTimeout(
        async () => {
          await treeKillAsync(childProcess.pid, signal);
        },
        STOP_TIMEOUT,
        async () => {
          log.warning(`Proc "${name}" was sent "${signal}" and didn't exit after ${STOP_TIMEOUT} ms, sending SIGKILL`);
          await treeKillAsync(childProcess.pid, 'SIGKILL');
        }
      );

      await withTimeout(
        async () => {
          try {
            await this.getOutcomePromise();
          } catch (error) {
            // ignore
          }
        },
        STOP_TIMEOUT,
        async () => {
          throw new Error(`Proc "${name}" was stopped but never emiited either the "exit" or "error" event after ${STOP_TIMEOUT} ms`);
        }
      );
    }
  }();
}
