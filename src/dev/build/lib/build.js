import chalk from 'chalk';

export function createBuild({ config, oss }) {
  const name = oss ? 'kibana-oss' : 'kibana';
  const logTag = oss ? chalk`{magenta [kibana-oss]}` : chalk`{cyan [  kibana  ]}`;

  return new class Build {
    isOss() {
      return !!oss;
    }

    resolvePath(...args) {
      return config.resolveFromRepo('build', name, ...args);
    }

    resolvePathForPlatform(platform, ...args) {
      return config.resolveFromRepo(
        'build',
        oss ? 'oss' : 'default',
        `kibana-${config.getBuildVersion()}-${platform.getBuildName()}`,
        ...args
      );
    }

    getPlatformArchivePath(platform) {
      const ext = platform.isWindows() ? 'zip' : 'tar.gz';
      return config.resolveFromRepo(
        'target',
        `${name}-${config.getBuildVersion()}-${platform.getBuildName()}.${ext}`
      );
    }

    getName() {
      return name;
    }

    getLogTag() {
      return logTag;
    }
  }();
}
