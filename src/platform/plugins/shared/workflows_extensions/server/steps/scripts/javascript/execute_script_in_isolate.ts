/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ivm from 'isolated-vm';

export interface ScriptLogger {
  debug(message: string, meta?: object): void;
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
}

export interface ExecuteScriptInIsolateParams {
  script: string;
  logger: ScriptLogger;
  abortSignal: AbortSignal;
  memoryLimitMb: number;
  executionTimeoutMs: number;
  maxConsoleLogCount: number;
}

const CONSOLE_BRIDGE_SCRIPT = `
(function () {
  const logBridge = __logBridge__;
  const formatArgs = (args) =>
    args
      .map((arg) => {
        if (arg === null) {
          return 'null';
        }
        if (arg === undefined) {
          return 'undefined';
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

  const emit = (level, args) =>
    logBridge.applySync(undefined, [level, formatArgs(args)], { arguments: { copy: true } });

  globalThis.console = {
    log: (...args) => emit('info', args),
    info: (...args) => emit('info', args),
    warn: (...args) => emit('warn', args),
    error: (...args) => emit('error', args),
    debug: (...args) => emit('debug', args),
  };
})();
`;

const USER_SCRIPT_RUNNER = `
  const AsyncFunction = async function () {}.constructor;
  return new AsyncFunction($0)();
`;

const runUserScript = (
  ivmContext: ivm.Context,
  script: string,
  executionTimeoutMs: number
): Promise<unknown> =>
  ivmContext.evalClosure(USER_SCRIPT_RUNNER, [script], {
    arguments: { copy: true },
    promise: true,
    result: { promise: true, copy: true },
    timeout: executionTimeoutMs,
  });

const routeConsoleToLogger = (level: string, message: string, logger: ScriptLogger): void => {
  switch (level) {
    case 'debug':
      logger.debug(message);
      return;
    case 'warn':
      logger.warn(message);
      return;
    case 'error':
      logger.error(message);
      return;
    case 'info':
    default:
      logger.info(message);
  }
};

const createAbortError = (): Error => new Error('Step execution was cancelled');

const raceWithAbort = async <T>(
  promise: Promise<T>,
  abortSignal: AbortSignal,
  isolate: ivm.Isolate
): Promise<T> => {
  if (abortSignal.aborted) {
    if (!isolate.isDisposed) {
      isolate.dispose();
    }
    throw createAbortError();
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      if (!isolate.isDisposed) {
        isolate.dispose();
      }
      reject(createAbortError());
    };

    abortSignal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => {
        abortSignal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        abortSignal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
};

const createCatastrophicError = (message: string): Error =>
  new Error(`Script isolate encountered a catastrophic error${message ? `: ${message}` : ''}`);

const createIsolateWithCatastrophicHandler = ({
  memoryLimitMb,
  logger,
}: {
  memoryLimitMb: number;
  logger: ScriptLogger;
}): {
  isolate: ivm.Isolate;
  catastrophicPromise: Promise<never>;
} => {
  let rejectCatastrophic: (error: Error) => void;
  const catastrophicPromise = new Promise<never>((_, reject) => {
    rejectCatastrophic = reject;
  });

  const isolate = new ivm.Isolate({
    memoryLimit: memoryLimitMb,
    onCatastrophicError: (message: string) => {
      const error = createCatastrophicError(message);
      logger.error('JavaScript step isolate catastrophic error', error);
      if (!isolate.isDisposed) {
        try {
          isolate.dispose();
        } catch {
          // isolate may already be corrupted
        }
      }
      rejectCatastrophic(error);
    },
  });

  return { isolate, catastrophicPromise };
};

export const executeScriptInIsolate = async ({
  script,
  logger,
  abortSignal,
  memoryLimitMb,
  executionTimeoutMs,
  maxConsoleLogCount,
}: ExecuteScriptInIsolateParams): Promise<unknown> => {
  const { isolate, catastrophicPromise } = createIsolateWithCatastrophicHandler({
    memoryLimitMb,
    logger,
  });

  try {
    const ivmContext = await isolate.createContext();
    const jail = ivmContext.global;

    await jail.set('global', jail.derefInto());

    let logCount = 0;

    const logBridge = new ivm.Reference((level: string, message: string) => {
      if (logCount >= maxConsoleLogCount) {
        return;
      }
      logCount++;
      routeConsoleToLogger(level, message, logger);
    });

    await jail.set('__logBridge__', logBridge);

    await ivmContext.eval(CONSOLE_BRIDGE_SCRIPT, {
      timeout: 1_000,
    });

    await jail.delete('__logBridge__');

    const resultPromise = await raceWithAbort(
      Promise.race([catastrophicPromise, runUserScript(ivmContext, script, executionTimeoutMs)]),
      abortSignal,
      isolate
    );

    return await resultPromise;
  } finally {
    if (!isolate.isDisposed) {
      isolate.dispose();
    }
  }
};
