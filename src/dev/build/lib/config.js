import { dirname, resolve, relative } from 'path';
import { platform as getOsPlatform } from 'os';

import { getVersionInfo } from './version_info';
import { createPlatform } from './platform';

export async function getConfig({ isRelease }) {
  const pkgPath = resolve(__dirname, '../../../../package.json');
  const pkg = require(pkgPath);
  const repoRoot = dirname(pkgPath);
  const nodeVersion = pkg.engines.node;

  const platforms = ['darwin', 'linux', 'windows'].map(createPlatform);
  const versionInfo = await getVersionInfo({
    isRelease,
    pkg,
  });

  return new class Config {
    /**
     * Get Kibana's parsed package.json file
     * @return {Object}
     */
    getKibanaPkg() {
      return pkg;
    }

    /**
     * Get the node version required by Kibana
     * @return {String}
     */
    getNodeVersion() {
      return nodeVersion;
    }

    /**
     * Convert an absolute path to a relative path, based from the repo
     * @param  {String} absolutePath
     * @return {String}
     */
    getRepoRelativePath(absolutePath) {
      return relative(repoRoot, absolutePath);
    }

    /**
     * Resolve a set of relative paths based from the directory of the Kibana repo
     * @param  {...String} ...subPaths
     * @return {String}
     */
    resolveFromRepo(...subPaths) {
      return resolve(repoRoot, ...subPaths);
    }

    /**
     * Return the list of Platforms we are targeting
     * @return {Array<Platform>}
     */
    getPlatforms() {
      return platforms;
    }

    /**
     * Get the linux platform object
     * @return {Platform}
     */
    getLinuxPlatform() {
      return platforms.find(p => p.isLinux());
    }

    /**
     * Get the windows platform object
     * @return {Platform}
     */
    getWindowsPlatform() {
      return platforms.find(p => p.isWindows());
    }

    /**
     * Get the mac platform object
     * @return {Platform}
     */
    getMacPlatform() {
      return platforms.find(p => p.isMac());
    }

    /**
     * Get the platform object representing the OS on this machine
     * @return {Platform}
     */
    getPlatformForThisOs() {
      switch (getOsPlatform()) {
        case 'darwin':
          return this.getMacPlatform();
        case 'win32':
          return this.getWindowsPlatform();
        case 'linux':
          return this.getLinuxPlatform();
        default:
          throw new Error(`Unable to find platform for this os`);
      }
    }

    /**
     * Get the version to use for this build
     * @return {String}
     */
    getBuildVersion() {
      return versionInfo.buildVersion;
    }

    /**
     * Get the build number of this build
     * @return {Number}
     */
    getBuildNumber() {
      return versionInfo.buildNumber;
    }

    /**
     * Get the git sha for this build
     * @return {String}
     */
    getBuildSha() {
      return versionInfo.buildSha;
    }

    /**
     * Resolve a set of paths based from the target directory for this build.
     * @param  {...String} ...subPaths
     * @return {String}
     */
    resolveFromTarget(...subPaths) {
      return resolve(repoRoot, 'target', ...subPaths);
    }
  }();
}
