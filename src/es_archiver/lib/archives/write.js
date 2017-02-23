import { createWriteStream } from 'fs';

import { isGzip } from './filenames';
import { createFormatArchiveStreams } from './format';

export function createWriteArchiveStreams(path) {
  return [
    ...createFormatArchiveStreams({ gzip: isGzip(path) }),
    createWriteStream(path),
  ];
}
