import readPkg from 'read-pkg';
import writePkg from 'write-pkg';
import path from 'path';

export type PackageJson = { [key: string]: any };
export type PackageDependencies = { [key: string]: string };
export type PackageScripts = { [key: string]: string };

export function readPackageJson(dir: string) {
  return readPkg(dir, { normalize: false });
}

export function writePackageJson(path: string, json: PackageJson) {
  return writePkg(path, json);
}

export const createProductionPackageJson = (pkgJson: PackageJson) => ({
  ...pkgJson,
  dependencies: transformDependencies(pkgJson.dependencies),
});

export const isLinkDependency = (depVersion: string) =>
  depVersion.startsWith('link:');

/**
 * Replaces `link:` dependencies with `file:` dependencies. When installing
 * dependencies, these `file:` dependencies will be copied into `node_modules`
 * instead of being symlinked.
 *
 * This will allow us to copy packages into the build and run `yarn`, which
 * will then _copy_ the `file:` dependencies into `node_modules` instead of
 * symlinking like we do in development.
 */
export function transformDependencies(dependencies: PackageDependencies = {}) {
  const newDeps: PackageDependencies = {};
  for (const name of Object.keys(dependencies)) {
    const depVersion = dependencies[name];
    if (isLinkDependency(depVersion)) {
      newDeps[name] = depVersion.replace('link:', 'file:');
    } else {
      newDeps[name] = depVersion;
    }
  }
  return newDeps;
}
