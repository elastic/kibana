/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createGzip, Z_BEST_COMPRESSION } from 'zlib';
import { PassThrough } from 'stream';
import stringify from 'json-stable-stringify';

import { createMapStream, createIntersperseStream } from '@kbn/utils';
import { RECORD_SEPARATOR } from './constants';

export function createFormatArchiveStreams({ gzip = false }: { gzip?: boolean } = {}) {
  return [
    createMapStream((record) => stringify(record, { space: '  ' })),
    createIntersperseStream(RECORD_SEPARATOR),
    gzip ? createGzip({ level: Z_BEST_COMPRESSION }) : new PassThrough(),
  ];
}
