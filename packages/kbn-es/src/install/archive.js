const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { log: defaultLog, extractTarball } = require('../utils');
const { BASE_PATH } = require('../paths');

/**
 * Extracts an ES archive and optionally installs plugins
 *
 * @param {String} archive - path to tar
 * @param {Object} options
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.installArchive = async function installArchive(
  archive,
  {
    basePath = BASE_PATH,
    installPath = path.resolve(basePath, path.basename(archive, '.tar.gz')),
    log = defaultLog,
  }
) {
  if (fs.existsSync(installPath)) {
    log.info('install directory already exists, removing');
    rmrfSync(installPath);
  }

  log.info('extracting %s', chalk.bold(archive));
  await extractTarball(archive, installPath);
  log.info('extracted to %s', chalk.bold(installPath));

  return { installPath };
};

/**
 * Recurive deletion for a directory
 *
 * @param {String} path
 */
function rmrfSync(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      const curPath = path + '/' + file;

      if (fs.lstatSync(curPath).isDirectory()) {
        rmrfSync(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}
