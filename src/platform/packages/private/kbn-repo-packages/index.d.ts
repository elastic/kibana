/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  PluginPackage,
  PluginSelector,
  KibanaPackageManifest,
  PluginPackageManifest,
  SharedBrowserPackageManifest,
  BasePackageManifest,
  KibanaPackageType,
  PackageExports,
  ParsedPackageJson,
  KbnImportReq,
  PluginCategoryInfo,
} from './modern/types';

export { Package } from './modern/package';

export type PackageMap = Map<string, string>;

export interface PkgDirMap {
  byDir: Map<string, Package>;
  byPkgId: Map<string, Package>;
}

export interface Jsonc {
  parse(text: string): unknown;
  stringify(value: unknown, replacer?: null, space?: number): string;
}

export const Jsonc: Jsonc;

export function getPackages(repoRoot: string): Package[];
export function findPackageForPath(pkgDirMap: PkgDirMap, path: string): Package | undefined;
export function getPkgDirMap(repoRoot: string): PkgDirMap;
export function getPkgsById(repoRoot: string): Map<string, Package>;
export function updatePackageMap(repoRoot: string, manifestPaths: string[]): void;
export function removePackagesFromPackageMap(names: string[], packageMapPath?: string): void;
export function readHashOfPackageMap(): string;
export function readPackageMap(packageMapPath?: string): PackageMap;
export function readPackageManifest(repoRoot: string, path: string): KibanaPackageManifest;
export function getPluginPackagesFilter(selector: PluginSelector): (pkg: Package) => boolean;
export function getPluginSearchPaths(selector: PluginSelector): string[];
export function parseKbnImportReq(req: string): KbnImportReq | undefined;
export function getRepoRels(repoRoot: string, paths: string[]): Promise<string[]>;
export function getRepoRelsSync(repoRoot: string, paths: string[]): string[];
export function readPackageJson(path: string): ParsedPackageJson | undefined;
