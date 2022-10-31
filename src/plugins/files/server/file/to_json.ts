/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pickBy } from 'lodash';
import type { FileMetadata, FileJSON } from '../../common/types';

export function serializeJSON<M = unknown>(attrs: Partial<FileJSON>): Partial<FileMetadata> {
  const { name, mimeType, size, created, updated, fileKind, status, alt, extension, meta } = attrs;
  return pickBy(
    {
      name,
      mime_type: mimeType,
      size,
      created,
      extension,
      Alt: alt,
      Status: status,
      Meta: meta as M,
      Updated: updated,
      FileKind: fileKind,
    },
    (v) => v != null
  );
}

export function toJSON<M = unknown>(id: string, attrs: FileMetadata): FileJSON<M> {
  const {
    name,
    mime_type: mimeType,
    size,
    created,
    Updated,
    FileKind,
    Status,
    Alt,
    extension,
    Meta,
  } = attrs;
  return pickBy<FileJSON<M>>(
    {
      id,
      name,
      mimeType,
      size,
      created,
      extension,
      alt: Alt,
      status: Status,
      meta: Meta as M,
      updated: Updated,
      fileKind: FileKind,
    },
    (v) => v != null
  ) as FileJSON<M>;
}
