/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import readPkg from 'read-pkg';
import writePkg from 'write-pkg';

export interface IPackageJson {
  [key: string]: any;
}
export interface IPackageDependencies {
  [key: string]: string;
}
export interface IPackageScripts {
  [key: string]: string;
}

export function readPackageJson(cwd: string): IPackageJson {
  return readPkg({ cwd, normalize: false });
}

export function writePackageJson(path: string, json: IPackageJson) {
  return writePkg(path, json);
}

export const isLinkDependency = (depVersion: string) => depVersion.startsWith('link:');
