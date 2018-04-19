const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

/**
 * Copies config references to an absolute path to
 * the provided destination. This is necicary as ES security
 * requires files to be within the installation directory
 *
 * @param {Array} config
 * @param {String} dest
 */
exports.extractConfigFiles = function extractConfigFiles(
  config,
  dest,
  options = {}
) {
  const originalConfig = typeof config === 'string' ? [config] : config;
  const localConfig = [];

  originalConfig.forEach(prop => {
    const [key, value] = prop.split('=');

    if (isFile(value)) {
      const filename = path.basename(value);
      const destPath = path.resolve(dest, 'config', filename);
      copyFileSync(value, destPath);

      if (options.log) {
        options.log.info('moved %s in config to %s', value, destPath);
      }

      localConfig.push(`${key}=${filename}`);
    } else {
      localConfig.push(prop);
    }
  });

  return localConfig;
};

function isFile(dest = '') {
  return path.isAbsolute(dest) && path.extname(dest).length > 0;
}

function copyFileSync(src, dest) {
  const destPath = path.dirname(dest);

  if (!fs.existsSync(destPath)) {
    mkdirp(destPath);
  }

  fs.writeFileSync(dest, fs.readFileSync(src));
}
