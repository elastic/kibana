const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const execa = require('execa');
const { log: defaultLog, extractTarball } = require('../utils');
const { BASE_PATH, ES_CONFIG, ES_KEYSTORE_BIN } = require('../paths');

/**
 * Extracts an ES archive and optionally installs plugins
 *
 * @param {String} archive - path to tar
 * @param {Object} options
 * @property {('oss'|'basic'|'trial')} options.license
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.installArchive = async function installArchive(archive, options = {}) {
  const {
    license = 'basic',
    password = 'changeme',
    basePath = BASE_PATH,
    installPath = path.resolve(basePath, path.basename(archive, '.tar.gz')),
    log = defaultLog,
  } = options;

  if (fs.existsSync(installPath)) {
    log.info('install directory already exists, removing');
    rmrfSync(installPath);
  }

  log.info('extracting %s', chalk.bold(archive));
  await extractTarball(archive, installPath);
  log.info('extracted to %s', chalk.bold(installPath));

  if (license !== 'oss') {
    await appendToConfig(
      installPath,
      'xpack.license.self_generated.type',
      license
    );

    await appendToConfig(installPath, 'xpack.security.enabled', 'true');
    await configureKeystore(installPath, password, log);
  }

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

/**
 * Appends single line to elasticsearch.yml config file
 *
 * @param {String} installPath
 * @param {String} key
 * @param {String} value
 */
async function appendToConfig(installPath, key, value) {
  fs.appendFileSync(
    path.resolve(installPath, ES_CONFIG),
    `${key}: ${value}\n`,
    'utf8'
  );
}

/**
 * Creates and configures Keystore
 *
 * @param {String} installPath
 * @param {String} password
 * @param {ToolingLog} log
 */
async function configureKeystore(installPath, password, log = defaultLog) {
  log.info('setting bootstrap password to %s', chalk.bold(password));

  await execa(ES_KEYSTORE_BIN, ['create'], { cwd: installPath });

  await execa(ES_KEYSTORE_BIN, ['add', 'bootstrap.password', '-x'], {
    input: password,
    cwd: installPath,
  });
}
