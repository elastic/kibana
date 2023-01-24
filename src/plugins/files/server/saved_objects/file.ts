/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType, SavedObjectsFieldMapping } from '@kbn/core/server';
import { FILE_SO_TYPE } from '../../common';
import type { FileMetadata } from '../../common';

type Properties = Record<
  keyof Omit<FileMetadata, 'Alt' | 'Compression' | 'ChunkSize' | 'hash'>,
  SavedObjectsFieldMapping
>;

const properties: Properties = {
  created: {
    type: 'date',
  },
  Updated: {
    type: 'date',
  },
  name: {
    type: 'text',
  },
  user: {
    type: 'flattened',
  },
  Status: {
    type: 'keyword',
  },
  mime_type: {
    type: 'keyword',
  },
  extension: {
    type: 'keyword',
  },
  size: {
    type: 'long',
  },
  Meta: {
    type: 'flattened',
  },
  FileKind: {
    type: 'keyword',
  },
};

export const fileObjectType: SavedObjectsType<FileMetadata> = {
  name: FILE_SO_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  management: {
    importableAndExportable: false,
  },
  mappings: {
    dynamic: false,
    properties,
  },
};
