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

export function readPackageJson(dir: string) {
  return readPkg(dir, { normalize: false });
}

export function writePackageJson(path: string, json: IPackageJson) {
  return writePkg(path, json);
}

export const createProductionPackageJson = (pkgJson: IPackageJson) => ({
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
export function transformDependencies(dependencies: IPackageDependencies = {}) {
  const newDeps: IPackageDependencies = {};
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
