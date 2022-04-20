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

import { asyncMap, asyncForEach } from '@kbn/std';

import { assertAbsolute, mkdirp } from './fs';

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
  filter?: (record: Record) => boolean;
  /**
   * define permissions for reach item copied
   */
  permissions?: (record: Record) => number | undefined;
  /**
   * Date to use for atime/mtime
   */
  time?: Date;
}

class Record {
  constructor(
    public isDirectory: boolean,
    public name: string,
    public absolute: string,
    public absoluteDest: string
  ) {}
}

/**
 * Copy all of the files from one directory to another, optionally filtered with a
 * function or modifying mtime/atime for each file.
 */
export async function scanCopy(options: Options) {
  const { source, destination, filter, time, permissions } = options;

  assertAbsolute(source);
  assertAbsolute(destination);

  // create or copy each child of a directory
  const copyChildren = async (parent: Record) => {
    const names = await Fsp.readdir(parent.absolute);

    const records = await asyncMap(names, async (name) => {
      const absolute = Path.join(parent.absolute, name);
      const stat = await Fsp.stat(absolute);
      return new Record(stat.isDirectory(), name, absolute, Path.join(parent.absoluteDest, name));
    });

    await asyncForEach(records, async (rec) => {
      if (filter && !filter(rec)) {
        return;
      }

      if (rec.isDirectory) {
        await Fsp.mkdir(rec.absoluteDest, {
          mode: permissions ? permissions(rec) : undefined,
        });
      } else {
        await Fsp.copyFile(rec.absolute, rec.absoluteDest, Fs.constants.COPYFILE_EXCL);
        if (permissions) {
          const perm = permissions(rec);
          if (perm !== undefined) {
            await Fsp.chmod(rec.absoluteDest, perm);
          }
        }
      }

      if (time) {
        await Fsp.utimes(rec.absoluteDest, time, time);
      }

      if (rec.isDirectory) {
        await copyChildren(rec);
      }
    });
  };

  await mkdirp(destination);
  await copyChildren(new Record(true, Path.basename(source), source, destination));
}
