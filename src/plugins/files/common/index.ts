/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  PLUGIN_ID,
  PLUGIN_NAME,
  ES_FIXED_SIZE_INDEX_BLOB_STORE,
  FILE_SO_TYPE,
  FILE_SHARE_SO_TYPE,
} from './constants';

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
