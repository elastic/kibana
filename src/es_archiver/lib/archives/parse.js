import { createGunzip } from 'zlib';
import { PassThrough } from 'stream';

import {
  createSplitStream,
  createJsonParseStream,
} from '../../../utils';

import { RECORD_SEPARATOR } from './constants';

export function createParseArchiveStreams({ gzip = false } = {}) {
  return [
    gzip ? createGunzip() : new PassThrough(),
    createSplitStream(RECORD_SEPARATOR),
    createJsonParseStream(),
  ];
}
