/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPackageManifest, ParsedPackageJson } from './types';

export class Package {
  static fromManifest(repoRoot: string, path: string): Package;
  static sorter(a: Package, b: Package): number;

  readonly directory: string;
  readonly normalizedRepoRelativeDir: string;
  readonly manifest: KibanaPackageManifest;
  readonly pkg: ParsedPackageJson;
  readonly name: string;
  readonly id: string;
  readonly isPlugin: boolean;

  constructor(
    repoRoot: string,
    directory: string,
    manifest: KibanaPackageManifest,
    pkg: ParsedPackageJson
  );

  isDevOnly(): boolean;
  getOwners(): string[];
}
