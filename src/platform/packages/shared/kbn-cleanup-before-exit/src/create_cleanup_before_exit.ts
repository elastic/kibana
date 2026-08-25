/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once, remove } from 'lodash';
import type { CleanupBeforeExitOptions, CleanupHandler } from './types';
import { wrapCleanupCallback } from './wrap_cleanup_callback';

type CleanupCallback = () => void | Promise<void>;

export function createCleanupBeforeExit(proc: NodeJS.Process) {
  const cleanupHandlers: CleanupHandler[] = [];
  const processExitController = new AbortController();

  let handlersInstalled = false;
  const originalProcessExit: typeof proc.exit = proc.exit.bind(proc);

  const cleanup = once(() => {
    return Promise.allSettled(
      cleanupHandlers.map((handler) => {
        return handler.fn();
      })
    );
  });

  const installHandlers = () => {
    if (handlersInstalled) {
      return;
    }
    handlersInstalled = true;

    proc.once('beforeExit', cleanup);
    proc.once('uncaughtExceptionMonitor', cleanup);
    proc.once('SIGINT', cleanup);
    proc.once('SIGTERM', cleanup);

    function quit(...args: any[]) {
      originalProcessExit(...args);
    }

    // @ts-expect-error
    proc.exit = once((...args: any[]) => {
      if (cleanupHandlers.filter((handler) => handler.blockExit).length === 0) {
        quit(...args);
      } else {
        processExitController.abort();
        cleanup().finally(() => {
          quit(...args);
        });
      }
    });
  };

  return function cleanupBeforeExit(
    callback: CleanupCallback,
    options: CleanupBeforeExitOptions = {}
  ): () => void {
    const fn = wrapCleanupCallback(callback, processExitController.signal, options);
    installHandlers();

    const handler = { fn, blockExit: options.blockExit || false };

    cleanupHandlers.push(handler);

    return () => {
      remove(cleanupHandlers, handler);
    };
  };
}
