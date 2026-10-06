/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractOperation } from '../openapi/types';

/** A request as a connector sent it. Header names are lowercase. */
export interface ContractRequest {
  readonly method: string;
  readonly url: URL;
  readonly query: Readonly<Record<string, string | string[]>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

export interface ContractResponse {
  readonly statusCode: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

/** A way a request or response breaks the contract, e.g. `query.limit` failing `maximum`. */
export interface Violation {
  readonly path: readonly string[];
  readonly code: string;
  readonly message: string;
}

export type RouteResult =
  | { readonly operation: ContractOperation }
  | { readonly status: number; readonly message: string };

/** Produces the mock's answer to a valid request. */
export type Responder = (
  operation: ContractOperation,
  request: ContractRequest
) => ContractResponse;

/** The steps the mock runs for every request, implemented once per spec format. */
export interface ContractAdapter {
  route(request: ContractRequest): RouteResult;
  validateRequest(operation: ContractOperation, request: ContractRequest): Violation[];
  respond: Responder;
  validateResponse(operation: ContractOperation, response: ContractResponse): Violation[];
}
