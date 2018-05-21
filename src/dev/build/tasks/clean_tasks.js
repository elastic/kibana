import { deleteAll } from '../lib';

export const CleanTask = {
  global: true,
  description: 'Cleaning artifacts from previous builds',

  async run(config, log) {
    await deleteAll(log, [
      config.resolveFromRepo('build'),
      config.resolveFromRepo('target'),
    ]);
  },
};

export const CleanPackagesTask = {
  description: 'Cleaning source for packages that are now installed in node_modules',

  async run(config, log, build) {
    await deleteAll(log, [
      build.resolvePath('packages'),
      build.resolvePath('x-pack')
    ]);
  },
};

export const CleanTypescriptTask = {
  description: 'Cleaning typescript source files that have been transpiled to JS',

  async run(config, log, build) {
    await deleteAll(log, [
      build.resolvePath('**/*.{ts,tsx,d.ts}'),
      build.resolvePath('**/tsconfig.json'),
    ]);
  },
};

export const CleanExtraFilesFromModulesTask = {
  description: 'Cleaning tests, examples, docs, etc. from node_modules',

  async run(config, log, build) {
    await deleteAll(log, [
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
      if (platform.isWindows()) {
        await deleteAll(log, [
          build.resolvePathForPlatform(platform, 'bin', '*'),
          `!${build.resolvePathForPlatform(platform, 'bin', '*.bat')}`
        ]);
      } else {
        await deleteAll(log, [
          build.resolvePathForPlatform(platform, 'bin', '*.bat'),
        ]);
      }
    }
  }
};
