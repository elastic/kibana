import {
  createSplitStream,
  createJsonParseStream,
} from '../../../utils';

import { RECORD_SEPARATOR } from './constants';

export function createParseArchiveStreams() {
  return [
    createSplitStream(RECORD_SEPARATOR),
    createJsonParseStream(),
  ];
}
