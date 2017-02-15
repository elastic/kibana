import { createReadStream, createWriteStream } from 'fs';
import { createGzip, createGunzip, Z_BEST_COMPRESSION } from 'zlib';
import { PassThrough } from 'stream';

import { isGzip } from './filenames';

import {
  createIntersperseStream,
  createSplitStream,
  createJsonParseStream,
  createJsonStringifyStream
} from '../../../utils';

const RECORD_SEPARATOR = '\n\n';

export function createReadArchiveStreams(path) {
  return [
    createReadStream(path),
    isGzip(path) ? createGunzip() : new PassThrough(),
    createSplitStream(RECORD_SEPARATOR),
    createJsonParseStream()
  ];
}

export function createWriteArchiveStreams(path) {
  return [
    createJsonStringifyStream({ pretty: true }),
    createIntersperseStream(RECORD_SEPARATOR),
    isGzip(path) ? createGzip({ level: Z_BEST_COMPRESSION }) : new PassThrough(),
    createWriteStream(path, { flags: 'w' })
  ];
}
