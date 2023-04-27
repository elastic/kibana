/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsFieldMapping, SavedObjectsType } from '@kbn/core/server';
import { MappingProperty as EsMappingProperty } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FileMetadata } from '../../common';
import { BaseFileMetadata, FILE_SO_TYPE } from '../../common';

type Properties = Record<
  keyof Omit<FileMetadata, 'Alt' | 'Compression' | 'ChunkSize'>,
  SavedObjectsFieldMapping
>;

export type SupportedFileHashAlgorithm = keyof Pick<
  Required<Required<BaseFileMetadata>['hash']>,
  'md5' | 'sha1' | 'sha256' | 'sha512'
>;

export type FileHashObj = Partial<Record<SupportedFileHashAlgorithm, string>>;

const hashProperties: Record<SupportedFileHashAlgorithm, EsMappingProperty> = {
  md5: { type: 'text' },
  sha1: { type: 'text' },
  sha256: { type: 'text' },
  sha512: { type: 'text' },
};

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
  hash: {
    properties: hashProperties,
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
