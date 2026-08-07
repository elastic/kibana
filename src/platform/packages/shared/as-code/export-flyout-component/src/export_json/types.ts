/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DependencyList } from 'react';

export type ExportJsonStatus = 'loading' | 'success' | 'error';

export type DownloadExportJson = (filename: string, content: string) => Promise<void> | void;

export type UseConsoleUrl = (
  getLocator: () => { id: string; params: { loadFrom: string } },
  dependencies: DependencyList
) => string | undefined;

export interface ExportJsonOpenInConsoleConfig {
  canShow: boolean;
  getRequest: (jsonValue: string) => string;
  label?: string;
  useUrl?: UseConsoleUrl;
}

export interface ExportJsonSharingData<State extends object> {
  title: string;
  getExportJson: () => State;
}

export interface ExportJsonPreparedState<PreparedState extends object> {
  status: ExportJsonStatus;
  data: PreparedState | undefined;
  warnings: string[];
  error: Error | undefined;
}

export interface ExportJsonPreparationResult<PreparedState extends object> {
  data: PreparedState | undefined;
  warnings: readonly string[];
}

export type PrepareExportJsonFunction<State extends object, PreparedState extends object> = (
  state: State
) => Promise<ExportJsonPreparationResult<PreparedState>>;
