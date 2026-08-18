/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ArtifactLicense } from '../artifact';

interface ConfigPathOption {
  /** Where to write `config/`, passed to ES as `ES_PATH_CONF`. Defaults to the install dir */
  configPath?: string;
}

export interface InstallSourceOptions extends ConfigPathOption {
  sourcePath: string;
  license?: ArtifactLicense;
  password?: string;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  esArgs?: string[];
  resources?: string[];
}

export interface DownloadSnapshotOptions {
  version: string;
  license?: ArtifactLicense;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  useCached?: boolean;
  resources?: string[];
}

export interface InstallSnapshotOptions extends DownloadSnapshotOptions, ConfigPathOption {
  password?: string;
  esArgs?: string[];
}

export interface InstallArchiveOptions extends ConfigPathOption {
  license?: ArtifactLicense;
  password?: string;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  esArgs?: string[];
  /** Disable creating a temp directory, allowing ES to write to OS's /tmp directory */
  disableEsTmpDir?: boolean;
  resources?: string[];
}
