/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

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

export interface DirRecord {
  type: 'dir';
  source: SomePath;
  dest: SomePath;
}

export interface FileRecord {
  type: 'file';
  source: SomePath;
  dest: SomePath;
  content?: string;
}

export type Record = FileRecord | DirRecord;
