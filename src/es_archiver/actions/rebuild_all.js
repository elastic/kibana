import { resolve } from 'path';
import {
  rename,
  createReadStream,
  createWriteStream
} from 'fs';

import { fromNode } from 'bluebird';

import {
  createPromiseFromStreams
} from '../../utils';

import {
  prioritizeMappings,
  readDirectory,
  findArchiveNames,
  isGzip,
  createParseArchiveStreams,
  createFormatArchiveStreams,
  createConvertToV6Stream,
} from '../lib';

export async function rebuildAllAction({ dataDir, log }) {
  const archiveNames = await findArchiveNames(dataDir);

  for (const name of archiveNames) {
    const inputDir = resolve(dataDir, name);
    const files = prioritizeMappings(await readDirectory(inputDir));
    for (const filename of files) {
      log.info('[%s] Rebuilding %j', name, filename);

      const path = resolve(inputDir, filename);
      const gzip = isGzip(path);
      const tempFile = path + (gzip ? '.rebuilding.gz' : '.rebuilding');

      await createPromiseFromStreams([
        createReadStream(path),
        ...createParseArchiveStreams({ gzip }),
        createConvertToV6Stream(),
        ...createFormatArchiveStreams({ gzip }),
        createWriteStream(tempFile),
      ]);

      await fromNode(cb => rename(tempFile, path, cb));
      log.info('[%s] Rebuilt %j', name, filename);
    }
  }
}
