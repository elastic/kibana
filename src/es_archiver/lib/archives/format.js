import { PassThrough } from 'stream';

import {
  createIntersperseStream,
  createJsonStringifyStream
} from '../../../utils';

import { RECORD_SEPARATOR } from './constants';

export function createFormatArchiveStreams() {
  return [
    createJsonStringifyStream({ pretty: true }),
    createIntersperseStream(RECORD_SEPARATOR),
    new PassThrough(),
  ];
}
