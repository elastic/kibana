import { spawn } from 'child_process';
import { statSync } from 'fs';

import Rx from 'rxjs/Rx';
import { gray } from 'chalk';

import treeKill from 'tree-kill';
import { promisify } from 'util';
const treeKillAsync = promisify(treeKill);

import { log } from './log';
import { observeLines } from './observe_lines';
import { observeChildProcess } from './observe_child_process';

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

export function createProc(name, { cmd, args, cwd, env, stdin }) {
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

  const childProcess = spawn(cmd, args, {
    cwd,
    env,
    stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'],
  });

  if (stdin) {
    childProcess.stdin.end(stdin, 'utf8');
  }

  return new class Proc {
    name = name;

    lines$ = Rx.Observable.merge(
      observeLines(childProcess.stdout),
      observeLines(childProcess.stderr)
    )
      .do(line => log.write(` ${gray('proc')}  [${gray(name)}] ${line}`))
      .share();

    outcome$ = observeChildProcess(name, childProcess).share();

    outcomePromise = Rx.Observable.merge(
      this.lines$.ignoreElements(),
      this.outcome$
    ).toPromise();

    closedPromise = this.outcomePromise.then(() => {}, () => {});

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
          await this.closedPromise;
        },
        STOP_TIMEOUT,
        async () => {
          throw new Error(`Proc "${name}" was stopped but never emiited either the "close" or "exit" events after ${STOP_TIMEOUT} ms`);
        }
      );
    }
  }();
}
