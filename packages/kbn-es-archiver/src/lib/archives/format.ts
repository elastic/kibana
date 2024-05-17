/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PassThrough } from 'stream';
import { Z_BEST_COMPRESSION, createGzip } from 'zlib';
import stringify from 'json-stable-stringify';

import { createIntersperseStream, createMapStream } from '@kbn/utils';
import { RECORD_SEPARATOR } from './constants';

export function createFormatArchiveStreams({ gzip = false }: { gzip?: boolean } = {}) {
  return [
    createMapStream((record) => stringify(record, { space: '  ' })),
    createIntersperseStream(RECORD_SEPARATOR),
    gzip ? createGzip({ level: Z_BEST_COMPRESSION }) : new PassThrough(),
  ];
}
