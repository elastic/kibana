/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv';
import type { JsonObject, VariantName } from '@kbn/workflow-step-schema-cli';

/** Data passed to the worker on construction. */
export interface ValidateWorkerData {
  schemas: Record<VariantName, JsonObject>;
}

/** Host -> worker: validate one document against a variant. */
export interface ValidateRequest {
  type: 'validate';
  id: number;
  variant: VariantName;
  target: unknown;
}

/** Worker -> host: the compiled validators are ready. */
export interface ReadyMessage {
  type: 'ready';
}

/** Worker -> host: compilation failed; the worker will not serve requests. */
export interface InitErrorMessage {
  type: 'init-error';
  message: string;
}

/** Worker -> host: the result of a {@link ValidateRequest}. */
export interface ResultMessage {
  type: 'result';
  id: number;
  errors: ErrorObject[];
  overflowed: boolean;
}

export type HostToWorker = ValidateRequest;
export type WorkerToHost = ReadyMessage | InitErrorMessage | ResultMessage;
