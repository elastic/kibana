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

export const CleanExtraBrowsersTask = {
  description: 'Cleaning extra browsers from platform-specific builds',

  async run(config, log, build) {
    const getBrowserPathsForPlatform = (platform) => {
      const reportingDir = 'node_modules/x-pack/plugins/reporting';
      const phantomDir = '.phantom';
      const chromiumDir = '.chromium';
      const phantomPath = p => build.resolvePathForPlatform(platform, reportingDir, phantomDir, p);
      const chromiumPath = p => build.resolvePathForPlatform(platform, reportingDir, chromiumDir, p);
      return platforms => {
        const paths = [];
        if (platforms.windows) {
          paths.push(phantomPath('phantomjs-*-windows.zip'));
          paths.push(chromiumPath('chromium-*-win32.zip'));
        }

        if (platforms.darwin) {
          paths.push(phantomPath('phantomjs-*-macosx.zip'));
          paths.push(chromiumPath('chromium-*-darwin.zip'));
        }

        if (platforms.linux) {
          paths.push(phantomPath('phantomjs-*-linux-x86_64.tar.bz2'));
          paths.push(chromiumPath('chromium-*-linux.zip'));
        }
        return paths;
      };
    };
    for (const platform of config.getPlatforms()) {
      const getBrowserPaths = getBrowserPathsForPlatform(platform);
      if (platform.isWindows()) {
        await del(getBrowserPaths({ linux: true, darwin: true }));
      }
      else if (platform.isMac()) {
        await del(getBrowserPaths({ linux: true, windows: true }));
      } else if (platform.isLinux()) {
        await del(getBrowserPaths({ windows: true, darwin: true }));
      }
    }
  }
};
