/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseFilesClient } from '@kbn/shared-ux-file-types';
import type { FilesMetrics } from './types';

/**
 * A client that can be used to manage a specific {@link FileKind}.
 */
export interface FilesClient<M = unknown> extends BaseFilesClient<M> {
  /**
   * Get metrics of file system, like storage usage.
   *
   * @param args - Get metrics arguments
   */
  getMetrics: () => Promise<FilesMetrics>;
  /**
   * Download a file, bypassing regular security by way of a
   * secret share token.
   *
   * @param args - Get public download arguments.
   */
  publicDownload: (args: { token: string; fileName?: string }) => any;
}

export type FilesClientResponses<M = unknown> = {
  [K in keyof FilesClient]: Awaited<ReturnType<FilesClient<M>[K]>>;
};

/**
 * A files client that is scoped to a specific {@link FileKind}.
 *
 * More convenient if you want to re-use the same client for the same file kind
 * and not specify the kind every time.
 */
export type ScopedFilesClient<M = unknown> = {
  [K in keyof FilesClient]: K extends 'list'
    ? (arg?: Omit<Parameters<FilesClient<M>[K]>[0], 'kind'>) => ReturnType<FilesClient<M>[K]>
    : (arg: Omit<Parameters<FilesClient<M>[K]>[0], 'kind'>) => ReturnType<FilesClient<M>[K]>;
};

/**
 * A factory for creating a {@link ScopedFilesClient}
 */
export interface FilesClientFactory {
  /**
   * Create a files client.
   */
  asUnscoped<M = unknown>(): FilesClient<M>;
  /**
   * Create a {@link ScopedFileClient} for a given {@link FileKind}.
   *
   * @param fileKind - The {@link FileKind} to create a client for.
   */
  asScoped<M = unknown>(fileKind: string): ScopedFilesClient<M>;
}
