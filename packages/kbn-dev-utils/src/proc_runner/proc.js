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
      await treeKillAsync(childProcess.pid, signal);
      await this.closedPromise;
    }
  }();
}
