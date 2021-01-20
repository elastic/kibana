/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const fs = require('fs');
const path = require('path');

const yauzl = require('yauzl');
const zlib = require('zlib');
const tarFs = require('tar-fs');

function decompressTarball(archive, dirPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(archive)
      .on('error', reject)
      .pipe(zlib.createGunzip())
      .on('error', reject)
      .pipe(tarFs.extract(dirPath, { strip: true }))
      .on('error', reject)
      .on('finish', resolve);
  });
}

function decompressZip(input, output) {
  fs.mkdirSync(output, { recursive: true });
  return new Promise((resolve, reject) => {
    yauzl.open(input, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
      }

      zipfile.readEntry();

      zipfile.on('close', () => {
        resolve();
      });

      zipfile.on('error', (err) => {
        reject(err);
      });

      zipfile.on('entry', (entry) => {
        const zipPath = entry.fileName.split(/\/|\\/).slice(1).join(path.sep);
        const fileName = path.resolve(output, zipPath);

        if (/\/$/.test(entry.fileName)) {
          fs.mkdirSync(fileName, { recursive: true });
          zipfile.readEntry();
        } else {
          // file entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
            }

            readStream.on('end', () => {
              zipfile.readEntry();
            });

            readStream.pipe(fs.createWriteStream(fileName));
          });
        }
      });
    });
  });
}

exports.decompress = async function (input, output) {
  const ext = path.extname(input);

  switch (path.extname(input)) {
    case '.zip':
      await decompressZip(input, output);
      break;
    case '.tar':
    case '.gz':
      await decompressTarball(input, output);
      break;
    default:
      throw new Error(`unknown extension "${ext}"`);
  }
};
