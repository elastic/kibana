/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ivm from 'isolated-vm';

export const SCRIPT_MEMORY_LIMIT_MB = 8;

export interface ScriptLogger {
  debug(message: string, meta?: object): void;
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
}

export interface ExecuteScriptInIsolateParams {
  script: string;
  context: unknown;
  logger: ScriptLogger;
  abortSignal: AbortSignal;
}

const CONSOLE_BRIDGE_SCRIPT = `
(function () {
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
    __logBridge__.applySync(undefined, [level, formatArgs(args)], { arguments: { copy: true } });

  globalThis.console = {
    log: (...args) => emit('info', args),
    info: (...args) => emit('info', args),
    warn: (...args) => emit('warn', args),
    error: (...args) => emit('error', args),
    debug: (...args) => emit('debug', args),
  };
})();
`;

const wrapUserScript = (script: string): string => `
(function () {
  const context = globalThis.__context__;
  ${script}
})()
`;

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

export const executeScriptInIsolate = async ({
  script,
  context,
  logger,
  abortSignal,
}: ExecuteScriptInIsolateParams): Promise<unknown> => {
  const isolate = new ivm.Isolate({ memoryLimit: SCRIPT_MEMORY_LIMIT_MB });

  try {
    const ivmContext = await isolate.createContext();
    const jail = ivmContext.global;

    await jail.set('global', jail.derefInto());

    const logBridge = new ivm.Reference((level: string, message: string) => {
      routeConsoleToLogger(level, message, logger);
    });

    await jail.set('__logBridge__', logBridge);

    await ivmContext.eval(CONSOLE_BRIDGE_SCRIPT, {
      timeout: 1_000,
    });

    await jail.set('__context__', new ivm.ExternalCopy(context).copyInto());

    const compiled = await isolate.compileScript(wrapUserScript(script));

    return await raceWithAbort(
      compiled.run(ivmContext, {
        copy: true,
        promise: true,
      }),
      abortSignal,
      isolate
    );
  } finally {
    if (!isolate.isDisposed) {
      isolate.dispose();
    }
  }
};
