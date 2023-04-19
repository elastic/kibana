/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileKind } from '@kbn/files-plugin/common';
import type { FileImageMetadata } from '@kbn/shared-ux-file-types';

export const PLUGIN_ID = 'filesExample' as const;
export const PLUGIN_NAME = 'Files example';
export const NO_MGT_LIST_FILE_KIND = `${PLUGIN_ID}NoMgtList` as const;
export const NO_MGT_DELETE_FILE_KIND = `${PLUGIN_ID}NoMgtDelete` as const;
export const FILE_KIND_IDS = [PLUGIN_ID, NO_MGT_LIST_FILE_KIND, NO_MGT_DELETE_FILE_KIND] as const;

export type FileTypeId = typeof FILE_KIND_IDS[number];

const httpTags = {
  tags: [`access:${PLUGIN_ID}`],
};

export const exampleFileKind: FileKind = {
  id: PLUGIN_ID,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain'],
  http: {
    create: httpTags,
    delete: httpTags,
    download: httpTags,
    getById: httpTags,
    list: httpTags,
    share: httpTags,
    update: httpTags,
  },
};

export const exampleFileKindNotListedInMangementUI: FileKind = {
  ...exampleFileKind,
  id: NO_MGT_LIST_FILE_KIND,
};

export const exampleFileKindNotDeletableInMangementUI: FileKind = {
  ...exampleFileKind,
  id: NO_MGT_DELETE_FILE_KIND,
};

export type MyImageMetadata = FileImageMetadata;
