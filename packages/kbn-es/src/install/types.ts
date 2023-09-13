/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { ArtifactLicense } from '../artifact';

export interface InstallSourceOptions {
  sourcePath: string;
  license?: ArtifactLicense;
  password?: string;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  esArgs?: string[];
}

export interface DownloadSnapshotOptions {
  version: string;
  license?: ArtifactLicense;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  useCached?: boolean;
}

export interface InstallSnapshotOptions extends DownloadSnapshotOptions {
  password?: string;
  esArgs?: string[];
}

export interface InstallArchiveOptions {
  license?: ArtifactLicense;
  password?: string;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  esArgs?: string[];
}
