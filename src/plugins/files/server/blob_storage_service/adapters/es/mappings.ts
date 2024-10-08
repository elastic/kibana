/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  MappingTypeMapping,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * These are the fields we expect to find a given document acting as a file chunk.
 *
 * @note not all fields are used by this adapter but this represents the standard
 * shape for any consumers of BlobStorage in ES.
 */
export interface FileChunkDocument {
  /**
   * Data contents. Could be part of a file (chunk) or the entire file.
   */
  data: string;

  /**
   * Blob ID field that tags a set of blobs as belonging to the same file.
   */
  bid: string;

  /**
   * Whether this is the last chunk in a sequence.
   */
  last?: boolean;
}

export const mappings: MappingTypeMapping = {
  dynamic: false,
  properties: {
    data: { type: 'binary' }, // Binary fields are automatically marked as not searchable by ES
    bid: { type: 'keyword', index: false },
    last: { type: 'boolean', index: false },
  } as Record<keyof FileChunkDocument, MappingProperty>, // Ensure that our ES types and TS types stay somewhat in sync
} as const;
