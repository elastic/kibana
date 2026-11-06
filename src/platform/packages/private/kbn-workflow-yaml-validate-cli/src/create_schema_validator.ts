/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { Worker } from 'worker_threads';
import type { ErrorObject } from 'ajv';
import type { JsonObject, VariantName } from '@kbn/workflow-step-schema-cli';
import type { ToolingLog } from '@kbn/tooling-log';
import { compileValidators } from './compile_validators';
import type { ValidateRequest, WorkerToHost } from './validate_worker_protocol';

/** Outcome of validating one document against a variant's compiled schema. */
export interface SchemaValidationResult {
  /** ajv errors (empty when the document is valid). */
  errors: ErrorObject[];
  /**
   * True when validation overflowed the (worker) stack even at the enlarged
   * stack size — i.e. a pathologically deep document. Reported as a distinct,
   * actionable issue rather than a silent failure.
   */
  overflowed: boolean;
}

/** Validate a parsed document against a schema variant. */
export type SchemaValidateFn = (
  variant: VariantName,
  target: unknown
) => Promise<SchemaValidationResult>;

/** A schema validator plus the resources (worker thread) backing it. */
export interface SchemaValidator {
  validateSchema: SchemaValidateFn;
  /** Release backing resources (terminate the worker thread). */
  close: () => Promise<void>;
}

/**
 * The workflow step schema is deeply recursive, and ajv compiles it into a
 * validator that consumes a large slice of the call stack per nesting level.
 * The main thread's stack is capped by the OS thread stack (~8 MB), so instead
 * we run validation in a worker thread whose stack we size explicitly. 32 MB
 * comfortably validates thousands of nesting levels — far beyond any real
 * workflow — while overflow (if ever reached) still surfaces as a catchable
 * error inside the worker rather than crashing the process.
 */
export const DEFAULT_WORKER_STACK_SIZE_MB = 32;

const WORKER_ENTRY = Path.resolve(__dirname, 'validate_worker_entry.js');

export interface CreateWorkerSchemaValidatorOptions {
  schemas: Record<VariantName, JsonObject>;
  stackSizeMb?: number;
  log?: ToolingLog;
}

/**
 * Compile the schema variants inside a worker thread with an enlarged stack and
 * return an async validator that dispatches documents to it. This is the path
 * the CLI uses so deeply-nested workflows validate without a stack overflow.
 */
export const createWorkerSchemaValidator = ({
  schemas,
  stackSizeMb = DEFAULT_WORKER_STACK_SIZE_MB,
  log,
}: CreateWorkerSchemaValidatorOptions): SchemaValidator => {
  const worker = new Worker(WORKER_ENTRY, {
    workerData: { schemas },
    resourceLimits: { stackSizeMb },
  });

  interface PendingRequest {
    resolve: (result: SchemaValidationResult) => void;
    reject: (error: Error) => void;
  }
  const pending = new Map<number, PendingRequest>();
  let nextId = 0;
  let fatal: Error | null = null;

  const failAll = (error: Error) => {
    fatal = error;
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
  };

  const ready = new Promise<void>((resolve, reject) => {
    const onFirst = (message: WorkerToHost) => {
      if (message.type === 'ready') {
        resolve();
      } else if (message.type === 'init-error') {
        reject(new Error(message.message));
      }
    };
    worker.once('message', onFirst);
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Schema validation worker exited early (code ${code}).`));
    });
  });

  worker.on('message', (message: WorkerToHost) => {
    if (message.type !== 'result') return;
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      request.resolve({ errors: message.errors, overflowed: message.overflowed });
    }
  });

  worker.on('error', (error) => {
    log?.debug(`Schema validation worker error: ${error.message}`);
    failAll(error);
  });

  const validateSchema: SchemaValidateFn = async (variant, target) => {
    await ready;
    if (fatal) {
      throw fatal;
    }
    return new Promise<SchemaValidationResult>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      const request: ValidateRequest = { type: 'validate', id, variant, target };
      worker.postMessage(request);
    });
  };

  const close = async () => {
    await worker.terminate();
  };

  return { validateSchema, close };
};

/**
 * Wrap already-compiled validators as a {@link SchemaValidateFn} that runs on the
 * current thread. Handy for programmatic/one-shot use where the caller has done
 * their own stack sizing; the CLI prefers {@link createWorkerSchemaValidator}.
 */
export const localSchemaValidator = (
  schemas: Record<VariantName, JsonObject>
): SchemaValidateFn => {
  const validators = compileValidators(schemas);
  return async (variant, target) => {
    try {
      const validate = validators[variant].validate;
      return { errors: validate(target) ? [] : validate.errors ?? [], overflowed: false };
    } catch {
      return { errors: [], overflowed: true };
    }
  };
};
