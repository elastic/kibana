/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilesClient, FilesSetup, FilesStart } from '@kbn/files-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';

export interface AppContext {
  filesClient: FilesClient;
  getFileKindDefinition: FilesStart['getFileKindDefinition'];
  getAllFindKindDefinitions: FilesStart['getAllFindKindDefinitions'];
}

export interface SetupDependencies {
  files: FilesSetup;
  management: ManagementSetup;
}
export interface StartDependencies {
  files: FilesStart;
}
