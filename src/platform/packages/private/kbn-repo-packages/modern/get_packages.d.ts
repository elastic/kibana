export type PkgDirMap = Map<string, import("./package").Package>;
export type PkgsById = Map<string, import("./package").Package>;
/**
 * Resolves to an array of Package instances which parse the manifest files,
 * package.json files, and provide useful metadata about each package.
 * @param {string} repoRoot
 * @returns {Package[]}
 */
export function getPackages(repoRoot: string): Package[];
/**
 * Get a map of repoRelative directories to packages
 * @param {string} repoRoot
 */
export function getPkgDirMap(repoRoot: string): PkgDirMap;
/**
 * Get a map of packages by id
 * @param {string} repoRoot
 * @returns {PkgsById}
 */
export function getPkgsById(repoRoot: string): PkgsById;
/**
 * @param {string} repoRoot
 * @param {string[]} manifestPaths
 */
export function updatePackageMap(repoRoot: string, manifestPaths: string[]): boolean;
/**
 * Removes packages from the package map
 * @param {string[]} names
 * @param {string=} packageMapPath
 */
export function removePackagesFromPackageMap(names: string[], packageMapPath?: string | undefined): void;
/**
 * Find the package which contains this path, if one exists
 * @param {string} repoRoot
 * @param {string} path absolute path to a file
 */
export function findPackageForPath(repoRoot: string, path: string): Package | undefined;
/**
 * Read the pkgmap from disk and parse it into a Map
 * @param {string=} packageMapPath
 * @returns {Map<string, string>}
 */
export function readPackageMap(packageMapPath?: string | undefined): Map<string, string>;
/**
 * Get the hash of the pkgmap, used for populating some cache keys
 * @returns {string}
 */
export function readHashOfPackageMap(): string;
import type { Package } from "./package";
