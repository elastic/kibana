import { resolve } from 'path';
import {
  rename,
  readdir,
  createReadStream,
  createWriteStream
} from 'fs';

import { fromNode } from 'bluebird';

import {
  createPromiseFromStreams
} from '../../utils';

import {
  prioritizeMappings,
  getArchiveFiles,
  isGzip,
  createParseArchiveStreams,
  createFormatArchiveStreams,
} from '../lib';

export async function rebuildAllAction({ dataDir, log }) {
  const archiveNames = await fromNode(cb => readdir(dataDir, cb));

  for (const name of archiveNames) {
    const inputDir = resolve(dataDir, name);
    const files = prioritizeMappings(await getArchiveFiles(inputDir));
    for (const filename of files) {
      log.info('[%s] Rebuilding %j', name, filename);

      const path = resolve(inputDir, filename);
      const gzip = isGzip(path);
      const tempFile = path + (gzip ? '.rebuilding.gz' : '.rebuilding');

      await createPromiseFromStreams([
        createReadStream(path),
        ...createParseArchiveStreams({ gzip }),
        ...createFormatArchiveStreams({ gzip }),
        createWriteStream(tempFile),
      ]);

      await fromNode(cb => rename(tempFile, path, cb));
      log.info('[%s] Rebuilt %j', name, filename);
    }
  }
}
