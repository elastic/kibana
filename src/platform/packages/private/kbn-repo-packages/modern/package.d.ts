/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModuleGroup, ModuleVisibility } from '@kbn/projects-solutions-groups';
import type {
  KibanaPackageManifest,
  ParsedPackageJson,
  PluginCategoryInfo,
  PluginPackage,
} from './types';

export declare class Package {
  static fromManifest(repoRoot: string, path: string): Package;
  static sorter(a: Package, b: Package): number;

  constructor(
    repoRoot: string,
    dir: string,
    manifest: KibanaPackageManifest,
    pkg: ParsedPackageJson | undefined
  );

  readonly directory: string;
  readonly normalizedRepoRelativeDir: string;
  readonly manifest: KibanaPackageManifest;
  readonly pkg: ParsedPackageJson | undefined;
  readonly name: string;
  readonly id: string;
  readonly group: ModuleGroup;
  readonly visibility: ModuleVisibility;

  isDevOnly(): boolean;
  isPlugin(): this is PluginPackage;
  getGroup(): ModuleGroup;
  getVisibility(): ModuleVisibility;
  getPluginCategories(): PluginCategoryInfo;
  determineGroupAndVisibility(): { group: ModuleGroup; visibility: ModuleVisibility };
}
