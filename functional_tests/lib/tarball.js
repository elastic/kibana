import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { sep as pathSeparator } from 'path';

import tarFs from 'tar-fs';

import { log } from './log';

/**
 *  [extract description]
 *  @param  {[type]} archive [description]
 *  @param  {[type]} dirPath [description]
 *  @return {[type]}         [description]
 */
export function extractTarball(archive, dirPath) {
  log.info('extracting %j', dirPath);

  const stripOne = header => {
    header.name = header.name.split(/\/|\\/).slice(1).join(pathSeparator);
    return header;
  };

  return new Promise((resolve, reject) => {
    createReadStream(archive)
      .on('error', reject)
    .pipe(createGunzip())
      .on('error', reject)
    .pipe(tarFs.extract(dirPath, { map: stripOne }))
      .on('error', reject)
      .on('finish', resolve);
  });
}
