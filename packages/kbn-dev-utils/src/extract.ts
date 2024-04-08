/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';
import { createWriteStream } from 'fs';
import Path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

import Tar from 'tar';
import Yauzl, { ZipFile, Entry } from 'yauzl';
import * as Rx from 'rxjs';
import { map, mergeMap, takeUntil } from 'rxjs';

const strComplete = (obs: Rx.Observable<unknown>) =>
  new Promise<void>((resolve, reject) => {
    obs.subscribe({ complete: resolve, error: reject });
  });

const asyncPipeline = promisify(pipeline);

interface Options {
  /**
   * Path to the archive to extract, .tar, .tar.gz, and .zip archives are supported
   */
  archivePath: string;

  /**
   * Directory where the contents of the archive will be written. Existing files in that
   * directory will be overwritten. If the directory doesn't exist it will be created.
   */
  targetDir: string;

  /**
   * Number of path segments to strip form paths in the archive, like --strip-components from tar
   */
  stripComponents?: number;

  /**
   * Write modified timestamps to extracted files
   */
  setModifiedTimes?: Date;
}

/**
 * Extract tar and zip archives using a single function, supporting stripComponents
 * for both archive types, only tested with familiar archives we create so might not
 * support some weird exotic zip features we don't use in our own snapshot/build tooling
 */
export async function extract({
  archivePath,
  targetDir,
  stripComponents = 0,
  setModifiedTimes,
}: Options) {
  await Fs.mkdir(targetDir, { recursive: true });

  if (archivePath.endsWith('.tar') || archivePath.endsWith('.tar.gz')) {
    return await Tar.x({
      file: archivePath,
      cwd: targetDir,
      stripComponents,
    });
  }

  if (!archivePath.endsWith('.zip')) {
    throw new Error('unsupported archive type');
  }

  // zip mode
  const zipFile = await new Promise<ZipFile>((resolve, reject) => {
    Yauzl.open(archivePath, { lazyEntries: true }, (error, _zipFile) => {
      if (error || !_zipFile) {
        reject(error || new Error('no zipfile provided by yauzl'));
      } else {
        resolve(_zipFile);
      }
    });
  });

  // bound version of zipFile.openReadStream which returns an observable, because of type defs the readStream
  // result is technically optional (thanks callbacks)
  const openReadStream$ = Rx.bindNodeCallback(zipFile.openReadStream.bind(zipFile));

  const close$ = Rx.fromEvent(zipFile, 'close');
  const error$ = Rx.fromEvent<Error>(zipFile, 'error').pipe(
    takeUntil(close$),
    map((error) => {
      throw error;
    })
  );

  const entry$ = Rx.fromEvent<Entry>(zipFile, 'entry').pipe(
    takeUntil(close$),
    mergeMap((entry) => {
      const entryPath = entry.fileName.split(/\/|\\/).slice(stripComponents).join(Path.sep);
      const fileName = Path.resolve(targetDir, entryPath);

      // detect directories
      if (entry.fileName.endsWith('/')) {
        return Rx.defer(async () => {
          // ensure the directory exists
          await Fs.mkdir(fileName, { recursive: true });
          // tell yauzl to read the next entry
          zipFile.readEntry();
        });
      }

      // file entry
      const writeFile$ = openReadStream$(entry).pipe(
        mergeMap(async (readStream) => {
          if (!readStream) {
            throw new Error('no readstream provided by yauzl');
          }

          // write the file contents to disk
          await asyncPipeline(readStream, createWriteStream(fileName));

          if (setModifiedTimes) {
            // update the modified time of the file to match the zip entry
            await Fs.utimes(fileName, setModifiedTimes, setModifiedTimes);
          }
        })
      );

      // tell yauzl to read the next entry
      zipFile.readEntry();

      return writeFile$;
    })
  );

  // trigger the initial 'entry' event, happens async so the event will be delivered after the observable is subscribed
  zipFile.readEntry();

  await strComplete(Rx.merge(entry$, error$));
}
