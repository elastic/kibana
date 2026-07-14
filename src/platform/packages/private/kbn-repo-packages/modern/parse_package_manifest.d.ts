/**
 * Parse a kibana.jsonc file from the filesystem
 * @param {string} repoRoot
 * @param {string} path
 */
export function readPackageManifest(repoRoot: string, path: string): import("./types").KibanaPackageManifest;
