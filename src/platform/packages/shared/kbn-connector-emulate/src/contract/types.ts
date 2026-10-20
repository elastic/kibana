/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OperationMatch, OperationMismatch } from '../openapi/match_operation';
import type { ContractOperation, Violation } from '../openapi/types';

export type { Violation };

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

export type RouteResult = OperationMatch | OperationMismatch;

/** Produces the mock's answer to a valid request. */
export type Responder = (
  operation: ContractOperation,
  request: ContractRequest
) => ContractResponse;

/** The steps the mock runs for every request, implemented once per spec format. */
export interface ContractAdapter {
  route(request: ContractRequest): RouteResult;
  /** Violations when the request lacks the credentials the operation requires. */
  authenticate(match: OperationMatch, request: ContractRequest): Violation[];
  validateRequest(match: OperationMatch, request: ContractRequest): Violation[];
  respond: Responder;
  validateResponse(operation: ContractOperation, response: ContractResponse): Violation[];
}
