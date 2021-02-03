/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Fs from 'fs';
import { basename, join } from 'path';
import { promisify } from 'util';

// @ts-ignore
import { assertAbsolute, mkdirp } from './fs';

const statAsync = promisify(Fs.stat);
const mkdirAsync = promisify(Fs.mkdir);
const utimesAsync = promisify(Fs.utimes);
const copyFileAsync = promisify(Fs.copyFile);
const readdirAsync = promisify(Fs.readdir);

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
  const { source, destination, filter, time } = options;

  assertAbsolute(source);
  assertAbsolute(destination);

  // get filtered Records for files/directories within a directory
  const getChildRecords = async (parent: Record) => {
    const names = await readdirAsync(parent.absolute);
    const records = await Promise.all(
      names.map(async (name) => {
        const absolute = join(parent.absolute, name);
        const stat = await statAsync(absolute);
        return new Record(stat.isDirectory(), name, absolute, join(parent.absoluteDest, name));
      })
    );

    return records.filter((record) => (filter ? filter(record) : true));
  };

  // create or copy each child of a directory
  const copyChildren = async (record: Record) => {
    const children = await getChildRecords(record);
    await Promise.all(children.map(async (child) => await copy(child)));
  };

  // create or copy a record and recurse into directories
  const copy = async (record: Record) => {
    if (record.isDirectory) {
      await mkdirAsync(record.absoluteDest);
    } else {
      await copyFileAsync(record.absolute, record.absoluteDest, Fs.constants.COPYFILE_EXCL);
    }

    if (time) {
      await utimesAsync(record.absoluteDest, time, time);
    }

    if (record.isDirectory) {
      await copyChildren(record);
    }
  };

  await mkdirp(destination);
  await copyChildren(new Record(true, basename(source), source, destination));
}
