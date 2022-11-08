/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface PkgInfo {
  /** id of the package this file is from */
  pkgId: string;
  /** Relative path to a file within a package directory */
  rel: string;
  /** Absolute path to the package directory */
  pkgDir: string;
  /** Is the package a bazel package? If false, then the package is a "synthetic" plugin package */
  isBazelPackage: boolean;
}
