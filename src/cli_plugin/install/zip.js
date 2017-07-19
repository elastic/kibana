import yauzl from 'yauzl';
import path from 'path';
import mkdirp from 'mkdirp';
import { createWriteStream } from 'fs';
import { get } from 'lodash';

/**
 * Returns an array of package objects. There will be one for each of
 *  package.json files in the archive
 *
 * @param {string} archive - path to plugin archive zip file
 */

export function analyzeArchive(archive) {
  const plugins = [];
  const regExp = new RegExp('(kibana[\\\\/][^\\\\/]+)[\\\\/]package\.json', 'i');

  return new Promise ((resolve, reject) => {
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

        zipfile.openReadStream(entry, function (err, readable) {
          const chunks = [];

          if (err) {
            return reject(err);
          }

          readable.on('data', chunk => chunks.push(chunk));

          readable.on('end', function () {
            const contents = Buffer.concat(chunks).toString();
            const pkg = JSON.parse(contents);

            plugins.push(Object.assign(pkg, {
              archivePath: match[1],
              archive: archive,

              // Plugins must specify their version, and by default that version should match
              // the version of kibana down to the patch level. If these two versions need
              // to diverge, they can specify a kibana.version to indicate the version of
              // kibana the plugin is intended to work with.
              kibanaVersion: get(pkg, 'kibana.version', pkg.version)
            }));

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

const isDirectoryRegex = /(\/|\\)$/;
export function _isDirectory(filename) {
  return isDirectoryRegex.test(filename);
}

export function extractArchive(archive, targetDir, extractPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(archive, { lazyEntries: true }, function (err, zipfile) {
      if (err) {
        return reject(err);
      }

      zipfile.readEntry();
      zipfile.on('close', resolve);
      zipfile.on('entry', function (entry) {
        let fileName = entry.fileName;

        if (extractPath && fileName.startsWith(extractPath)) {
          fileName = fileName.substring(extractPath.length);
        } else {
          return zipfile.readEntry();
        }

        if (targetDir) {
          fileName = path.join(targetDir, fileName);
        }

        if (_isDirectory(fileName)) {
          mkdirp(fileName, function (err) {
            if (err) {
              return reject(err);
            }

            zipfile.readEntry();
          });
        } else {
          // file entry
          zipfile.openReadStream(entry, function (err, readStream) {
            if (err) {
              return reject(err);
            }

            // ensure parent directory exists
            mkdirp(path.dirname(fileName), function (err) {
              if (err) {
                return reject(err);
              }

              readStream.pipe(createWriteStream(fileName));
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
