import { createReadStream } from 'fs';

import { isGzip } from './filenames';
import { createParseArchiveStreams } from './parse';

export function createReadArchiveStreams(path) {
  return [
    createReadStream(path),
    ...createParseArchiveStreams({ gzip: isGzip(path) }),
  ];
}
