/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

export class RepoPath {
  constructor(
    /** root path of the repo where this file was found */
    public readonly repoRoot: string,
    /** repo-relative path to the file */
    public readonly repoRel: string
  ) {}

  private _abs: string | undefined;
  /**
   * absolute path to the file
   * (lazy and cached getter)
   */
  public get abs() {
    return (this._abs ??= Path.resolve(this.repoRoot, this.repoRel));
  }

  private _ext: string | undefined;
  /**
   * extension to the filename
   * (lazy and cached getter)
   */
  public get ext() {
    return (this._ext ??= Path.extname(this.repoRel));
  }

  private _basename: string | undefined;
  /**
   * basename of the path (including extension)
   * (lazy and cached getter)
   */
  public get basename() {
    return (this._basename ??= Path.basename(this.repoRel));
  }

  private _repoRelDir: string | undefined;
  /**
   * repoRelDir of the path
   * (lazy and cached getter)
   */
  public get repoRelDir() {
    return (this._repoRelDir ??= Path.dirname(this.repoRel));
  }

  isTypeScript() {
    return this.ext === '.ts' || this.ext === '.tsx';
  }

  isTypeScriptAmbient() {
    return this.repoRel.endsWith('.d.ts');
  }

  isJavaScript() {
    return this.ext === '.js' || this.ext === '.jsx' || this.ext === '.mjs';
  }

  isJsTsCode() {
    return this.isTypeScript() || this.isJavaScript();
  }

  isFixture() {
    const parts = this.repoRel.split('/');
    if (parts.includes('__fixtures__') || this.repoRel.endsWith('.test-d.ts')) {
      return true;
    }

    const i = parts.indexOf('kbn-generate');
    if (i >= 0 && parts[i + 1] === 'templates') {
      return true;
    }

    return false;
  }
}
