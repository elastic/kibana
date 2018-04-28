import { transformDependencies } from '@kbn/pm';

import { read, write } from '../lib';

export const CreatePackageJsonTask = {
  description: 'Creating build-ready version of package.json',

  async run(config, log, build) {
    const pkg = config.getKibanaPkg();

    const newPkg = {
      name: pkg.name,
      description: pkg.description,
      keywords: pkg.keywords,
      version: config.getBuildVersion(),
      branch: pkg.branch,
      build: {
        number: config.getBuildNumber(),
        sha: config.getBuildSha(),
      },
      repository: pkg.repository,
      engines: {
        node: pkg.engines.node,
      },
      dependencies: transformDependencies(pkg.dependencies),
    };

    if (build.isOss()) {
      delete newPkg.dependencies['x-pack'];
    }

    await write(
      build.resolvePath('package.json'),
      JSON.stringify(newPkg, null, '  ')
    );
  },
};

export const RemovePackageJsonDepsTask = {
  description: 'Removing dependencies from package.json',

  async run(config, log, build) {
    const path = build.resolvePath('package.json');
    const pkg = JSON.parse(await read(path));

    delete pkg.dependencies;

    await write(
      build.resolvePath('package.json'),
      JSON.stringify(pkg, null, '  ')
    );
  },
};
