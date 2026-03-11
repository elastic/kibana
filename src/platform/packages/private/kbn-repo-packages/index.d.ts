/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BasePackageManifest,
  KbnImportReq,
  KibanaPackageManifest,
  KibanaPackageType,
  PackageExports,
  PackageManifestBaseFields,
  ParsedPackageJson,
  PluginCategoryInfo,
  PluginPackage,
  PluginPackageManifest,
  PluginSelector,
  SharedBrowserPackageManifest,
} from './modern/types';
import { Package } from './modern/package';

export { Package };

export type {
  BasePackageManifest,
  KbnImportReq,
  KibanaPackageManifest,
  KibanaPackageType,
  PackageExports,
  PackageManifestBaseFields,
  ParsedPackageJson,
  PluginCategoryInfo,
  PluginPackage,
  PluginPackageManifest,
  PluginSelector,
  SharedBrowserPackageManifest,
};

export type PackageMap = Map<string, string>;
export type PkgDirMap = Map<string, Package>;
export type PkgsById = Map<string, Package>;

export declare function getPackages(repoRoot: string): Package[];
export declare function findPackageForPath(repoRoot: string, path: string): Package | undefined;
export declare function getPkgDirMap(repoRoot: string): PkgDirMap;
export declare function getPkgsById(repoRoot: string): PkgsById;
export declare function updatePackageMap(repoRoot: string, manifestPaths: string[]): boolean;
export declare function removePackagesFromPackageMap(
  names: string[],
  packageMapPath?: string
): void;
export declare function readHashOfPackageMap(): string;
export declare function readPackageMap(packageMapPath?: string): PackageMap;
export declare function readPackageManifest(repoRoot: string, path: string): KibanaPackageManifest;
export declare function parseKbnImportReq(importReq: string): KbnImportReq | undefined;
export declare function getRepoRels(
  repoRoot: string,
  include?: string[],
  exclude?: string[]
): Promise<Iterable<string>>;
export declare function getRepoRelsSync(
  repoRoot: string,
  include?: string[],
  exclude?: string[]
): Iterable<string>;
export declare const Jsonc: {
  parse(jsonWithComments: string): unknown;
};
export declare function getPluginPackagesFilter(
  selector?: PluginSelector
): (pkg: Package) => pkg is PluginPackage;
export declare function getPluginSearchPaths(options: { rootDir: string }): string[];
export declare function readPackageJson(path: string): ParsedPackageJson | undefined;
