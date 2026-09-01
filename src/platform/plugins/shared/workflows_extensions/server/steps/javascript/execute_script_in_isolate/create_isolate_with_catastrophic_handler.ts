/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ivm from 'isolated-vm';
import { createCatastrophicError } from './create_catastrophic_error';
import type { ScriptLogger } from './script_logger';

export const createIsolateWithCatastrophicHandler = ({
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
