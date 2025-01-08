/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { FileKind } from '../common';
import { FileServiceFactory } from './file_service/file_service_factory';

/**
 * Files plugin setup contract
 */
export interface FilesServerSetup {
  /**
   * Register a {@link FileKind} which allows for specifying details about the files
   * that will be uploaded.
   *
   * @param {FileKind} fileKind - the file kind to register
   *
   * @track-adoption
   */
  registerFileKind(fileKind: FileKind): void;
}

/**
 * Files plugin start contract
 */
export interface FilesServerStart {
  /**
   * Create an instance of {@link FileServiceStart}.
   *
   * @track-adoption
   */
  fileServiceFactory: FileServiceFactory;
}

export interface FilesServerSetupDependencies {
  security?: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface FilesServerStartDependencies {
  security?: SecurityPluginStart;
}
