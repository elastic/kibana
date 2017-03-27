import { createGzip, Z_BEST_COMPRESSION } from 'zlib';
import { PassThrough } from 'stream';

import {
  createIntersperseStream,
  createJsonStringifyStream
} from '../../../utils';

import { RECORD_SEPARATOR } from './constants';

export function createFormatArchiveStreams({ gzip = false } = {}) {
  return [
    createJsonStringifyStream({ pretty: true }),
    createIntersperseStream(RECORD_SEPARATOR),
    gzip ? createGzip({ level: Z_BEST_COMPRESSION }) : new PassThrough(),
  ];
}
