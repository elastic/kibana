/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DownloadSnapshotOptions, InstallSnapshotOptions } from './types';
/**
 * Download an ES snapshot
 */
export declare function downloadSnapshot({
  license,
  version,
  basePath,
  installPath,
  log,
  useCached,
}: DownloadSnapshotOptions): Promise<{
  downloadPath: string;
}>;
/**
 * Installs ES from snapshot
 */
export declare function installSnapshot({
  license,
  password,
  version,
  basePath,
  installPath,
  log,
  esArgs,
  useCached,
  resources,
}: InstallSnapshotOptions): Promise<{
  installPath: string;
  disableEsTmpDir: boolean;
}>;
