import readPkg from 'read-pkg';
import writePkg from 'write-pkg';
import path from 'path';

export function readPackageJson(dir) {
  return readPkg(path.join(dir, 'package.json'), { normalize: false });
}

export function writePackageJson(path, json) {
  return writePkg(path, json);
}

export const createProductionPackageJson = pkgJson => ({
  ...pkgJson,
  dependencies: transformDependencies(pkgJson.dependencies),
});

/**
 * Replaces `link:` dependencies with `file:` dependencies. When installing
 * dependencies, these `file:` dependencies will be copied into `node_modules`
 * instead of being symlinked.
 *
 * This will allow us to copy packages into the build and run `yarn`, which
 * will then _copy_ the `file:` dependencies into `node_modules` instead of
 * symlinking like we do in development.
 */
export function transformDependencies(dependencies = {}) {
  const newDeps = {};
  for (const name of Object.keys(dependencies)) {
    const depVersion = dependencies[name];
    if (depVersion.startsWith('link:')) {
      newDeps[name] = depVersion.replace('link:', 'file:');
    } else {
      newDeps[name] = depVersion;
    }
  }
  return newDeps;
}
