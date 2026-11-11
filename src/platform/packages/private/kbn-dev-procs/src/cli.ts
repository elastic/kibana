/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { run } from '@kbn/dev-cli-runner';
import type { CleanupTask, FlagsReader } from '@kbn/dev-cli-runner';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { getDefaultProcesses } from './default_processes';
import { readStatusFile } from './status_file';
import { Supervisor } from './supervisor';
import type { InkModule } from './tui/ink_module';
import { runTui } from './tui/run_tui';
import type { ProcessStatus } from './types';

const DEFAULT_LOG_DIR = path.join(REPO_ROOT, 'data', 'dev');
const DEFAULT_WAIT_TIMEOUT_SECONDS = 600;
const WAIT_POLL_MS = 1000;

const displayPath = (file: string): string => {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith('..') ? file : relative;
};

const describe = ({ id, state, pid, error, logFile }: ProcessStatus): string => {
  const details = [state, pid ? `pid ${pid}` : undefined, error].filter(Boolean).join(', ');
  return `${id}: ${details}\n  log: ${displayPath(logFile)}`;
};

const SIGNAL_NUMBERS = { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 } as const;

/**
 * Stops every process gracefully on the first signal and kills them on the next one. run() exits as soon as a
 * signal arrives, which would orphan the processes in their own process groups, so this replaces its handlers.
 */
const stopOnSignals = (supervisor: Supervisor, log?: ToolingLog): void => {
  let isStopping = false;
  for (const [signal, signalNumber] of Object.entries(SIGNAL_NUMBERS)) {
    process.removeAllListeners(signal);
    process.on(signal, () => {
      if (isStopping) {
        log?.warning(`${signal} again: killing every process`);
        supervisor.signalAll('SIGKILL');
        process.exit(128 + signalNumber);
      }
      isStopping = true;
      log?.info(`${signal}: stopping every process, Kibana first (send it again to kill them)`);
      void supervisor.stopAll().then(() => process.exit(128 + signalNumber));
    });
  }
};

export interface DevCliOptions {
  /** Loads `ink` for the TUI; it is ESM-only, so the caller imports it natively. Without it, start is headless. */
  readonly loadInk?: () => Promise<InkModule>;
}

interface StartOptions extends DevCliOptions {
  readonly log: ToolingLog;
  readonly flagsReader: FlagsReader;
  readonly logDir: string;
  readonly addCleanupTask: (task: CleanupTask) => void;
}

const runStart = async ({ log, flagsReader, logDir, addCleanupTask, loadInk }: StartOptions) => {
  const hideOutput = flagsReader.boolean('hide-output');
  const isTui = Boolean(loadInk) && process.stdout.isTTY && !flagsReader.boolean('headless');
  const supervisor = new Supervisor({
    definitions: getDefaultProcesses({
      esArgs: flagsReader.arrayOfStrings('es-arg'),
      kibanaArgs: flagsReader.arrayOfStrings('kibana-arg'),
      esUrl: flagsReader.string('es-url'),
    }),
    logDir,
  });

  // Last resort when the supervisor exits without stopping its processes, e.g. on an error: exit handlers
  // cannot await, so this only signals; Elasticsearch and Kibana shut down gracefully on SIGTERM.
  addCleanupTask(() => supervisor.signalAll('SIGTERM'));
  // The TUI shows the states itself; writing to stdout would corrupt its screen.
  stopOnSignals(supervisor, isTui ? undefined : log);

  if (isTui && loadInk) {
    await runTui(await loadInk(), supervisor);
    return;
  }

  supervisor.onChange(({ id, state, error }) => {
    const message = `${id}: ${state}${error ? ` (${error})` : ''}`;
    if (state === 'ready') log.success(message);
    else if (state === 'failed') log.error(message);
    else log.info(message);
  });
  if (!hideOutput) {
    supervisor.onLine(({ processId, text }) => {
      process.stdout.write(`[${processId}] ${text}\n`);
    });
  }

  log.info(`logs and status.json are written to ${displayPath(logDir)}`);
  await supervisor.startAll();
  await supervisor.whenAllEnded();
};

const runStatus = async (log: ToolingLog, flagsReader: FlagsReader, logDir: string) => {
  const statusFile = path.join(logDir, 'status.json');
  const waitFor = flagsReader.string('wait-for');
  const timeoutSeconds = flagsReader.number('timeout') ?? DEFAULT_WAIT_TIMEOUT_SECONDS;
  const deadline = Date.now() + timeoutSeconds * 1000;

  while (true) {
    const result = readStatusFile(statusFile);
    if (result.type === 'missing') {
      throw createFailError(
        `No status at ${statusFile}; start the processes with node scripts/dev`
      );
    }
    const { status } = result;
    if (result.type === 'stale') {
      throw createFailError(
        `node scripts/dev (pid ${status.supervisorPid}) is no longer running; last status at ${status.updatedAt}`
      );
    }

    const target = waitFor ? status.processes.find(({ id }) => id === waitFor) : undefined;
    if (waitFor && !target) {
      throw createFlagError(
        `--wait-for: unknown process "${waitFor}", expected one of ${status.processes
          .map(({ id }) => id)
          .join(', ')}`
      );
    }

    const isDone = !target || !['waiting', 'starting', 'stopping'].includes(target.state);
    if (isDone || Date.now() >= deadline) {
      if (flagsReader.boolean('json')) {
        process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
      } else {
        status.processes.forEach((processStatus) => log.write(describe(processStatus)));
      }
      if (target && target.state !== 'ready') {
        throw createFailError(
          isDone
            ? `${target.id} is ${target.state}`
            : `${target.id} not ready after ${timeoutSeconds}s`
        );
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_POLL_MS));
  }
};

/** Entry point for `node scripts/dev`. */
export const runDevCli = ({ loadInk }: DevCliOptions = {}): void => {
  run(
    async ({ log, flagsReader, addCleanupTask }) => {
      const [command = 'start', ...extra] = flagsReader.getPositionals();
      if (extra.length > 0) {
        throw createFlagError(`Unexpected arguments: ${extra.join(' ')}`);
      }
      const logDir = flagsReader.path('log-dir') ?? DEFAULT_LOG_DIR;
      if (command === 'start') {
        await runStart({ log, flagsReader, logDir, addCleanupTask, loadInk });
        return;
      }
      if (command === 'status') {
        await runStatus(log, flagsReader, logDir);
        return;
      }
      throw createFlagError(`Unknown command "${command}", expected start or status`);
    },
    {
      usage: 'node scripts/dev [start|status] [options]',
      description: `Runs Elasticsearch and Kibana together: Kibana starts once Elasticsearch is ready, each process logs to <log-dir>/<id>.log and <log-dir>/status.json reports their state.

      In a terminal it shows a TUI with a pane per process: select with the arrow keys, filter with /, restart (r), start (s) or stop (x) the selected process, and quit (q) to stop all of them.

      node scripts/dev                         start Elasticsearch and Kibana
      node scripts/dev --headless              the same without the TUI, e.g. for agents and CI
      node scripts/dev status                  show the state of each process
      node scripts/dev status --wait-for kibana  wait until Kibana is ready (exits 1 if it fails or times out)`,
      flags: {
        string: ['log-dir', 'es-arg', 'kibana-arg', 'es-url', 'wait-for', 'timeout'],
        boolean: ['headless', 'hide-output', 'json'],
        help: `
        --log-dir      Where logs and status.json are written (default data/dev)

        start:
        --es-arg       Argument passed to "node scripts/es snapshot", repeatable, e.g. --es-arg=--license=trial
        --kibana-arg   Argument passed to "node scripts/kibana --dev", repeatable
        --es-url       Where Elasticsearch answers, for its readiness check (default http://localhost:9200)
        --headless     Print the combined output instead of showing the TUI (the default without a terminal)
        --hide-output  With --headless, only report state changes, not the output of each process

        status:
        --wait-for     Wait until this process is ready, e.g. kibana
        --timeout      Seconds to wait for --wait-for (default ${DEFAULT_WAIT_TIMEOUT_SECONDS})
        --json         Print the status as JSON
      `,
      },
    }
  );
};
