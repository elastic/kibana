/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Mirrors core's `PluginInitState`, spelled out here so browser code does not import server types. */
export type InitState = 'idle' | 'initializing' | 'available' | 'failed';

/** Core's `PluginInitStatus` with the error reduced to its message, as the status routes serve it. */
export interface InitStatusBody {
  state: InitState;
  attempts: number;
  lastError?: string;
}

/** Serializes a core `PluginInitStatus` (matched structurally) into a JSON-friendly body. */
export const toStatusBody = ({
  state,
  attempts,
  lastError,
}: {
  state: InitState;
  attempts: number;
  lastError?: Error;
}): InitStatusBody =>
  lastError ? { state, attempts, lastError: lastError.message } : { state, attempts };
