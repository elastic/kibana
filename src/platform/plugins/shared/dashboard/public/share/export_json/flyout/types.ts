/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ExportJsonStatus = 'loading' | 'success' | 'error';

export interface ExportJsonSharingData<State extends object> {
  title: string;
  isByReference?: boolean;
  exportJson: (byReference?: boolean) => State;
}

export interface ExportJsonSanitizedState<SanitizedState extends object> {
  status: ExportJsonStatus;
  data: SanitizedState | undefined;
  warnings: string[];
  error: Error | undefined;
}

export type SanitizeStateFunction<State extends object, SanitizedState extends object> = (
  state: State
) => Promise<{ data: SanitizedState; warnings: Array<{ message: string }> }>;
