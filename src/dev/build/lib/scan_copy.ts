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

import { asyncForEach } from '@kbn/std';

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
  /**
   *
   */
  map?: (path: string) => Promise<undefined | { source: string | Buffer; filename?: string }>;
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
    const children = await Fsp.readdir(parent.absolute, {
      withFileTypes: true,
    });

    await asyncForEach(
      children.map((child) => {
        return new Record(
          child.isDirectory(),
          child.name,
          Path.join(parent.absolute, child.name),
          Path.join(parent.absoluteDest, child.name)
        );
      }),
      async (rec) => {
        if (filter && !filter(rec)) {
          return;
        }

        if (rec.isDirectory) {
          await Fsp.mkdir(rec.absoluteDest, {
            mode: permissions ? permissions(rec) : undefined,
          });
        } else {
          const mapped = options.map ? await options.map(rec.absolute) : undefined;

          if (mapped === undefined) {
            await Fsp.copyFile(rec.absolute, rec.absoluteDest, Fs.constants.COPYFILE_EXCL);
          } else {
            if (mapped.filename) {
              rec.absoluteDest = Path.resolve(Path.dirname(rec.absoluteDest), mapped.filename);
            }

            await Fsp.writeFile(rec.absoluteDest, mapped.source, {
              flag: 'wx',
            });
          }

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
      }
    );
  };

  await mkdirp(destination);
  await copyChildren(new Record(true, Path.basename(source), source, destination));
}
