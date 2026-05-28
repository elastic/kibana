/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface InitResponse {
  readonly type: 'started';
}

interface SourceFoundResponse {
  readonly type: 'source_found';
  readonly sourceIndex: string;
}

interface SourceMissingResponse {
  readonly type: 'source_missing';
  readonly reason: string;
}

export type CheckSourceResponse = SourceFoundResponse | SourceMissingResponse;

interface TargetCreatedResponse {
  readonly type: 'target_created';
  readonly targetIndex: string;
}

interface RetryableFailureResponse {
  readonly type: 'retryable_failure';
  readonly message: string;
}

interface FatalFailureResponse {
  readonly type: 'fatal_failure';
  readonly reason: string;
}

export type CreateTargetResponse =
  | TargetCreatedResponse
  | RetryableFailureResponse
  | FatalFailureResponse;

interface ReadyResponse {
  readonly type: 'ready';
}

export type MarkReadyResponse = ReadyResponse | FatalFailureResponse;

export interface IO {
  readonly init: () => Promise<InitResponse>;
  readonly checkSource: () => Promise<CheckSourceResponse>;
  readonly createTarget: (sourceIndex: string) => Promise<CreateTargetResponse>;
  readonly markReady: (targetIndex: string) => Promise<MarkReadyResponse>;
}
