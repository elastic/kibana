/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import Path from 'path';
import * as Rx from 'rxjs';

import { assertAbsolute, mkdirp } from './fs';

const fsReadDir$ = Rx.bindNodeCallback(
  (path: string, cb: (err: Error | null, ents: Fs.Dirent[]) => void) => {
    Fs.readdir(path, { withFileTypes: true }, cb);
  }
);

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
   * function that is called with each Record
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
   *
   */
  map?: (record: Readonly<FileRecord>) => Promise<undefined | FileRecord>;
}

export class SomePath {
  static fromAbs(path: string) {
    return new SomePath(Path.dirname(path), Path.basename(path));
  }

  constructor(
    /** The directory of the item at this path */
    public readonly dir: string,
    /** The name of the item at this path */
    public readonly name: string
  ) {}

  private _abs: string | null = null;
  /** The absolute path of the file */
  public get abs() {
    if (this._abs === null) {
      this._abs = Path.resolve(this.dir, this.name);
    }

    return this._abs;
  }

  private _ext: string | null = null;
  /** The extension of the filename, starts with a . like the Path.extname API */
  public get ext() {
    if (this._ext === null) {
      this._ext = Path.extname(this.name);
    }

    return this._ext;
  }

  /** return a file path with the file name changed to `name` */
  withName(name: string) {
    return new SomePath(this.dir, name);
  }

  /** return a file path with the file extension changed to `extension` */
  withExt(extension: string) {
    return new SomePath(this.dir, Path.basename(this.name, this.ext) + extension);
  }

  child(childName: string) {
    return new SomePath(this.abs, childName);
  }
}

interface DirRecord {
  type: 'dir';
  source: SomePath;
  dest: SomePath;
}

interface FileRecord {
  type: 'file';
  source: SomePath;
  dest: SomePath;
  content?: string;
}

type Record = FileRecord | DirRecord;

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
    })
  );
}
