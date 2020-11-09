/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import path from 'path';
import { createWriteStream, mkdir } from 'fs';

import yauzl from 'yauzl';

const isDirectoryRegex = /(\/|\\)$/;
function isDirectory(filename) {
  return isDirectoryRegex.test(filename);
}

/**
 * Returns an array of package objects. There will be one for each of
 * package.json files in the archive
 */

export function analyzeArchive(archive) {
  const plugins = [];
  const regExp = new RegExp('(kibana[\\\\/][^\\\\/]+)[\\\\/]kibana.json', 'i');

  return new Promise((resolve, reject) => {
    yauzl.open(archive, { lazyEntries: true }, function (err, zipfile) {
      if (err) {
        return reject(err);
      }

      zipfile.readEntry();
      zipfile.on('entry', function (entry) {
        const match = entry.fileName.match(regExp);

        if (!match) {
          return zipfile.readEntry();
        }

        zipfile.openReadStream(entry, function (error, readable) {
          const chunks = [];

          if (error) {
            return reject(error);
          }

          readable.on('data', (chunk) => chunks.push(chunk));

          readable.on('end', function () {
            const manifestJson = Buffer.concat(chunks).toString();
            const manifest = JSON.parse(manifestJson);

            plugins.push({
              id: manifest.id,
              stripPrefix: match[1],

              // Plugins must specify their version, and by default that version in the plugin
              // manifest should match the version of kibana down to the patch level. If these
              // two versions need plugins can specify a kibanaVersion to indicate the version
              // of kibana the plugin is intended to work with.
              kibanaVersion:
                typeof manifest.kibanaVersion === 'string' && manifest.kibanaVersion
                  ? manifest.kibanaVersion
                  : manifest.version,
            });

            zipfile.readEntry();
          });
        });
      });

      zipfile.on('close', () => {
        resolve(plugins);
      });
    });
  });
}

export function extractArchive(archive, targetDir, stripPrefix) {
  return new Promise((resolve, reject) => {
    yauzl.open(archive, { lazyEntries: true }, function (err, zipfile) {
      if (err) {
        return reject(err);
      }

      zipfile.readEntry();
      zipfile.on('close', resolve);
      zipfile.on('entry', function (entry) {
        let fileName = entry.fileName;

        if (stripPrefix && fileName.startsWith(stripPrefix)) {
          fileName = fileName.substring(stripPrefix.length);
        } else {
          return zipfile.readEntry();
        }

        if (targetDir) {
          fileName = path.join(targetDir, fileName);
        }

        if (isDirectory(fileName)) {
          mkdir(fileName, { recursive: true }, function (error) {
            if (error) {
              return reject(error);
            }

            zipfile.readEntry();
          });
        } else {
          // file entry
          zipfile.openReadStream(entry, function (error, readStream) {
            if (error) {
              return reject(error);
            }

            // ensure parent directory exists
            mkdir(path.dirname(fileName), { recursive: true }, function (error2) {
              if (error2) {
                return reject(error2);
              }

              readStream.pipe(
                createWriteStream(fileName, {
                  // eslint-disable-next-line no-bitwise
                  mode: entry.externalFileAttributes >>> 16,
                })
              );

              readStream.on('end', function () {
                zipfile.readEntry();
              });
            });
          });
        }
      });
    });
  });
}
