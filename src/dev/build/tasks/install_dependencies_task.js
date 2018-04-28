import { exec } from '../lib';

export const InstallDependenciesTask = {
  description: 'Installing node_modules, including production builds of packages',

  async run(config, log, build) {
    // We're using `pure-lockfile` instead of `frozen-lockfile` because we
    // rewrite `link:` dependencies to `file:` dependencies earlier in the
    // build. This means the lockfile won't be consistent, so instead of
    // verifying it, we just skip writing a new lockfile. However, this does
    // still use the existing lockfile for dependency resolution.
    const args = ['--production', '--ignore-optional', '--pure-lockfile'];

    await exec(log, 'yarn', args, {
      cwd: build.resolvePath(),
    });
  },
};
