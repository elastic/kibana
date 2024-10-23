/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { FILE_SO_TYPE, PLUGIN_ID, PLUGIN_NAME, ES_FIXED_SIZE_INDEX_BLOB_STORE } from './constants';

export type {
  File,
  FileKind,
  FileKindBrowser,
  FileJSON,
  FileShare,
  FileStatus,
  Pagination,
  FileMetadata,
  FilesMetrics,
  FileShareJSON,
  FileCompression,
  FileSavedObject,
  BaseFileMetadata,
  FileShareOptions,
  FileUnshareOptions,
  BlobStorageSettings,
  UpdatableFileMetadata,
  FileShareJSONWithToken,
  UpdatableFileShareMetadata,
} from './types';

import * as DefaultFileKind from './default_image_file_kind';
export { DefaultFileKind };
