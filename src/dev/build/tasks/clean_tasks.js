import del from 'del';

export const CleanTask = {
  global: true,
  description: 'Cleaning artifacts from previous builds',

  async run(config) {
    await del([
      config.resolveFromRepo('build'),
      config.resolveFromRepo('target'),
    ]);
  },
};

export const CleanPackagesTask = {
  description: 'Cleaning source for packages that are now installed in node_modules',

  async run(config, log, build) {
    await del([build.resolvePath('packages'), build.resolvePath('x-pack')]);
  },
};

export const CleanExtraFilesFromModulesTask = {
  description: 'Cleaning tests, examples, docs, etc. from node_modules',

  async run(config, log, build) {
    await del([
      build.resolvePath('node_modules/**/test/**/*'),
      build.resolvePath('node_modules/**/tests/**/*'),
      build.resolvePath('node_modules/**/example/**/*'),
      build.resolvePath('node_modules/**/examples/**/*'),
    ]);
  },
};

export const CleanExtraBinScriptsTask = {
  description: 'Cleaning extra bin/* scripts from platform-specific builds',

  async run(config, log, build) {
    for (const platform of config.getPlatforms()) {
      const patterns = platform.isWindows() ? ['*', '!*.bat'] : ['*.bat'];
      await del(patterns, {
        cwd: build.resolvePathForPlatform(platform, 'bin')
      });
    }
  }
};
