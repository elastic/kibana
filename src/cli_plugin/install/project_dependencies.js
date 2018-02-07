import path from 'path';

import * as fs from '../lib/fs';

const LINK_DEP = 'link:';

const isKibanaDep = depVersion =>
  depVersion.startsWith(`${LINK_DEP}../../kibana/`);

export async function prepareProjectDependencies(settings) {
  const packageJsonPath = path.resolve(settings.workingPath, 'package.json');
  const rawPkgJson = await fs.readFile(packageJsonPath, 'utf-8');
  const pkgJson = JSON.parse(rawPkgJson);

  const deps = pkgJson.dependencies || {};

  for (const depName of Object.keys(deps)) {
    const depVersion = deps[depName];

    // Kibana currently only supports `link:` dependencies on Kibana's own
    // packages, as these are packaged into the `node_modules` folder when
    // Kibana is built, so we don't need to take any action to enable
    // `require(...)` to resolve for these packages.
    if (depVersion.startsWith(LINK_DEP) && !isKibanaDep(depVersion)) {
      // For non-Kibana packages we need to set up symlinks during the
      // installation process, but this is not something we support yet.
      throw new Error(
        'This plugin is using `link:` dependencies for non-Kibana packages'
      );
    }
  }
}
