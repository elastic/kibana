/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ivm from 'isolated-vm';
import { CONSOLE_BRIDGE_SCRIPT } from './console_bridge_script';
import { createIsolateWithCatastrophicHandler } from './create_isolate_with_catastrophic_handler';
import type { ExecuteScriptInIsolateParams } from './execute_script_in_isolate_params';
import { normalizeIsolateExecutionError } from './normalize_isolate_execution_error';
import { raceWithAbort } from './race_with_abort';
import { routeConsoleToLogger } from './route_console_to_logger';
import { runUserScript } from './user_script_runner';

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
  } catch (error) {
    throw normalizeIsolateExecutionError(error);
  } finally {
    if (!isolate.isDisposed) {
      isolate.dispose();
    }
  }
};
