const { dirname, resolve } = require('path');
const glob = require('glob-all');

module.exports = function getPlugins(config, kibanaPath, projectRoot) {
  const resolveToRoot = path => resolve(projectRoot, path);

  const pluginDirs = [
    ...(config.pluginDirs || []).map(resolveToRoot),
    resolve(kibanaPath, 'plugins'),
    resolve(kibanaPath, 'src/core_plugins'),
  ];

  const pluginPaths = [
    ...(config.pluginPaths || []).map(resolveToRoot),

    // when the rootPackageName is specified we assume that the root of the project
    // is not a plugin, so don't include it automatically
    ...(config.rootPackageName ? [] : [projectRoot]),
  ];

  const globPatterns = [
    ...pluginDirs.map(dir => resolve(dir, '*/package.json')),
    ...pluginPaths.map(path => resolve(path, 'package.json')),
  ];

  return glob.sync(globPatterns).map(pkgJsonPath => {
    const path = dirname(pkgJsonPath);
    const pkg = require(pkgJsonPath);
    return {
      name: pkg.name,
      directory: path,
      publicDirectory: resolve(path, 'public'),
    };
  });
};
