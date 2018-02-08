import path from 'path';
import mkdirp from 'mkdirp';

import * as fs from '../lib/fs';

const LINK_DEP = 'link:';

// Already located in `node_modules`
const isKibanaDep = depVersion =>
  depVersion.startsWith(`${LINK_DEP}../../kibana/`);

export async function symlinkProjects(settings, logger) {
  await symlinkDependencies(
    settings.workingPath,
    logger
  );
}

async function symlinkDependencies(pluginPath, logger) {
  const nodeModulesPath = path.resolve(pluginPath, 'node_modules');
  const packageJsonPath = path.resolve(pluginPath, 'package.json');

  const rawPkgJson = await fs.readFile(packageJsonPath, 'utf-8');
  const pkgJson = JSON.parse(rawPkgJson);

  const deps = pkgJson.dependencies || {};

  for (const depName of Object.keys(deps)) {
    const depVersion = deps[depName];

    // symlink all `link:` dependencies, except Kibana dependencies, as those
    // are already located in `node_modules`
    if (depVersion.startsWith(LINK_DEP) && !isKibanaDep(depVersion)) {
      let pathToDependency = depVersion.slice(LINK_DEP.length);

      // to find the source, we need to resolve the location, given the current
      // working path.
      pathToDependency = path.resolve(pluginPath, pathToDependency);

      logger.log(
        `Symlinking dependency [${depName}] to [${pathToDependency}]`
      );

      if (!await fs.exists(pathToDependency)) {
        throw new Error(`Preparing to symlink [${depName}], but source [${pathToDependency}] does not exist`);
      }

      const dest = path.join(nodeModulesPath, depName);

      await mkdirp(path.dirname(dest));

      await symlink(pathToDependency, dest);
    }
  }
}

function symlink(src, dest) {
  if (process.platform === 'win32') {
    return createWindowsSymlink(src, dest);
  }

  return createPosixSymlink(src, dest);
}

function createPosixSymlink(origin, dest) {
  const src = path.relative(path.dirname(dest), origin);
  return createSymbolicLink(src, dest);
}

function createWindowsSymlink(src, dest) {
  return createSymbolicLink(src, dest);
}

async function createSymbolicLink(src, dest) {
  if (await fs.exists(dest)) {
    // Something exists at `dest`. Need to remove it first.
    await fs.unlink(dest);
  }

  await fs.symlink(src, dest, 'junction');
}
