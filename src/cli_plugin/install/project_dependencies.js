import path from 'path';

import * as fs from '../lib/fs';

const LINK_DEP = 'link:';

const isKibanaDep = depVersion =>
  depVersion.startsWith(`${LINK_DEP}../../kibana/`);

export async function prepareProjectDependencies(settings, logger) {
  await handleLinkDependencies(
    settings.workingPath,
    logger
  );
}

async function handleLinkDependencies(pluginPath) {
  const packageJsonPath = path.resolve(pluginPath, 'package.json');
  const rawPkgJson = await fs.readFile(packageJsonPath, 'utf-8');
  const pkgJson = JSON.parse(rawPkgJson);

  const deps = pkgJson.dependencies || {};

  for (const depName of Object.keys(deps)) {
    const depVersion = deps[depName];

    if (depVersion.startsWith(LINK_DEP)) {
      if (isKibanaDep) {
        // We found a `link:` dependency that relies on a Kibana package. These
        // packages are already present in Kibana's `node_modules` folder so we
        // don't need to take any action.
      } else {
        // We currently only allow `link:` dependencies for Kibana packages, as
        // those don't require setting up symlinks.
        throw new Error(
          'This plugin is using `link:` dependencies for non-Kibana packages'
        );
      }
    }
  }
}
