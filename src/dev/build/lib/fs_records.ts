/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

export class SomePath {
  static fromAbs(path: string) {
    return new SomePath(Path.dirname(path), Path.basename(path), path);
  }

  private constructor(
    /** The directory of the item at this path */
    public readonly dir: string,
    /** The name of the item at this path */
    public readonly name: string,
    /** The filesystem path that contains this path, "rel" will be relative to this path */
    public readonly cwd: string = '/'
  ) {}

  private _rel: string | null = null;
  public get rel() {
    if (this._rel === null) {
      this._rel = Path.relative(this.cwd, this.abs);
    }
    return this._rel;
  }

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

  private _tags: readonly string[] | null = null;
  /** The extension of the filename, starts with a . like the Path.extname API */
  public get tags() {
    if (this._tags === null) {
      this._tags = this.name.split('.').slice(0, -1);
    }

    return this._tags;
  }

  /** return a file path with the file name changed to `name` */
  withName(name: string) {
    return new SomePath(this.dir, name, this.cwd);
  }

  /** return a file path with the file extension changed to `extension` */
  withExt(extension: string) {
    return new SomePath(this.dir, Path.basename(this.name, this.ext) + extension, this.cwd);
  }

  child(childName: string) {
    return new SomePath(this.abs, childName, this.cwd);
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
