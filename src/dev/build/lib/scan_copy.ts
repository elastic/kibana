/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import * as Rx from 'rxjs';

import { assertAbsolute, mkdirp, fsReadDir$ } from './fs';
import { type DirRecord, type FileRecord, type Record, SomePath } from './fs_records';

interface Options {
  /**
   * directory to copy from
   */
  source: string;
  /**
   * path to copy to
   */
  destination: string;
  /**
   * function that is called with each Record. If a falsy value is returned the
   * record will be dropped. If it is a directory none of its children will be
   * considered.
   */
  filter?: (record: Readonly<Record>) => boolean;
  /**
   * define permissions for reach item copied
   */
  permissions?: (record: Readonly<Record>) => number | undefined;
  /**
   * Date to use for atime/mtime
   */
  time?: Date;
  /**
   * function which can replace the records of files as they are copied
   */
  map?: (record: Readonly<FileRecord>) => Promise<undefined | FileRecord>;
}

/**
 * Copy all of the files from one directory to another, optionally filtered with a
 * function or modifying mtime/atime for each file.
 */
export async function scanCopy(options: Options) {
  const { source, destination, filter, time, permissions, map } = options;

  assertAbsolute(source);
  assertAbsolute(destination);

  /**
   * recursively fetch all the file records within a directory, starting with the
   * files in the passed directory, then the files in all the child directories in
   * no particular order
   */
  const readDir$ = (dir: DirRecord): Rx.Observable<Record> =>
    fsReadDir$(dir.source.abs).pipe(
      Rx.mergeAll(),
      Rx.mergeMap((ent) => {
        const rec: Record = {
          type: ent.isDirectory() ? 'dir' : 'file',
          source: dir.source.child(ent.name),
          dest: dir.dest.child(ent.name),
        };

        if (filter && !filter(rec)) {
          return Rx.EMPTY;
        }

        return Rx.of(rec);
      })
    );

  const handleGenericRec = async (rec: Record) => {
    if (permissions) {
      const perm = permissions(rec);
      if (perm !== undefined) {
        await Fsp.chmod(rec.dest.abs, perm);
      }
    }

    if (time) {
      await Fsp.utimes(rec.dest.abs, time, time);
    }
  };

  const handleDir$ = (rec: DirRecord): Rx.Observable<unknown> =>
    Rx.defer(async () => {
      await mkdirp(rec.dest.abs);
      await handleGenericRec(rec);
    }).pipe(
      Rx.mergeMap(() => readDir$(rec)),
      Rx.mergeMap((ent) => (ent.type === 'dir' ? handleDir$(ent) : handleFile$(ent)))
    );

  const handleFile$ = (srcRec: FileRecord): Rx.Observable<unknown> =>
    Rx.defer(async () => {
      const rec = (map && (await map(srcRec))) ?? srcRec;

      if (rec.content) {
        await Fsp.writeFile(rec.dest.abs, rec.content, {
          flag: 'wx',
        });
      } else {
        await Fsp.copyFile(rec.source.abs, rec.dest.abs, Fs.constants.COPYFILE_EXCL);
      }

      await handleGenericRec(rec);
    });

  await Rx.lastValueFrom(
    handleDir$({
      type: 'dir',
      source: SomePath.fromAbs(source),
      dest: SomePath.fromAbs(destination),
    }).pipe(Rx.defaultIfEmpty(undefined))
  );
}
