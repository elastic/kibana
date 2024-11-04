/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MyImageMetadata } from '../common';
import type {
  FilesSetup,
  FilesStart,
  ScopedFilesClient,
  FilesClient,
  DeveloperExamplesSetup,
} from './imports';

export interface FilesExamplePluginsSetup {
  files: FilesSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface FilesExamplePluginsStart {
  files: FilesStart;
}

export interface FileClients {
  unscoped: FilesClient<MyImageMetadata>;
  // Example file kind
  example: ScopedFilesClient<MyImageMetadata>;
}

export interface AppPluginStartDependencies {
  files: FileClients;
}
