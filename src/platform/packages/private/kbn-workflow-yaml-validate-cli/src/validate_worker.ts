/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parentPort, workerData } from 'worker_threads';
import type { ErrorObject } from 'ajv';
import type { VariantName } from '@kbn/workflow-step-schema-cli';
import { compileValidators, type VariantValidator } from './compile_validators';
import type {
  HostToWorker,
  ResultMessage,
  ValidateWorkerData,
  WorkerToHost,
} from './validate_worker_protocol';

/**
 * Worker-thread half of the schema validator. The host compiles the (deeply
 * recursive) workflow schema here — inside a thread with an enlarged stack — so
 * that validating deeply-nested workflows does not overflow the call stack.
 */
const port = parentPort;
if (!port) {
  throw new Error('validate_worker must be run as a worker thread.');
}

const post = (message: WorkerToHost) => port.postMessage(message);

let validators: Record<VariantName, VariantValidator>;
try {
  const { schemas } = workerData as ValidateWorkerData;
  validators = compileValidators(schemas);
  post({ type: 'ready' });
} catch (error) {
  post({ type: 'init-error', message: error instanceof Error ? error.message : String(error) });
  // Leave the worker idle; the host rejects on `init-error` and terminates it.
}

port.on('message', (message: HostToWorker) => {
  if (message.type !== 'validate' || !validators) {
    return;
  }
  const { id, variant, target } = message;
  let errors: ErrorObject[] = [];
  let overflowed = false;
  try {
    const { validate } = validators[variant];
    if (!validate(target)) {
      errors = validate.errors ?? [];
    }
  } catch {
    // Even with the enlarged stack, a pathologically deep document can overflow.
    overflowed = true;
  }
  const result: ResultMessage = { type: 'result', id, errors, overflowed };
  post(result);
});
