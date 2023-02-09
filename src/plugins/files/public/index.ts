/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilesPlugin } from './plugin';
export { defaultImageFileKind } from '../common/default_image_file_kind';
export type { FilesSetup, FilesStart } from './plugin';
export type {
  FilesClient,
  ScopedFilesClient,
  FilesClientFactory,
  FilesClientResponses,
} from './types';

export function plugin() {
  return new FilesPlugin();
}
