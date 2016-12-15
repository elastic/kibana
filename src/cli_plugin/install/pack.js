import _ from 'lodash';
import { listFiles, extractFiles } from './zip';
import { resolve } from 'path';
import { sync as rimrafSync } from 'rimraf';
import validate from 'validate-npm-package-name';

/**
 * Returns an array of package objects. There will be one for each of
 *  package.json files in the archive
 * @param {object} settings - a plugin installer settings object
 */
async function listPackages(settings) {
  const regExp = new RegExp('(kibana/([^/]+))/package.json', 'i');
  const archiveFiles = await listFiles(settings.tempArchiveFile);

  return _(archiveFiles)
    .map(file => file.replace(/\\/g, '/'))
    .map(file => file.match(regExp))
    .compact()
    .map(([ file, _, folder ]) => ({ file, folder }))
    .uniq()
    .value();
}

/**
 * Extracts the package.json files into the workingPath
 * @param {object} settings - a plugin installer settings object
 * @param {array} packages - array of package objects from listPackages()
 */
async function extractPackageFiles(settings, packages) {
  const filter = {
    files: packages.map((pkg) => pkg.file)
  };
  await extractFiles(settings.tempArchiveFile, settings.workingPath, 0, filter);
}

/**
 * Deletes the package.json files created by extractPackageFiles()
 * @param {object} settings - a plugin installer settings object
 */
function deletePackageFiles(settings) {
  const fullPath = resolve(settings.workingPath, 'kibana');
  rimrafSync(fullPath);
}

/**
 * Checks the plugin name. Will throw an exception if it does not meet
 *  npm package naming conventions
 * @param {object} plugin - a package object from listPackages()
 */
function assertValidPackageName(plugin) {
  const validation = validate(plugin.name);
  if (!validation.validForNewPackages) {
    throw new Error(`Invalid plugin name [${plugin.name}] in package.json`);
  }
}

/**
 * Examine each package.json file to determine the plugin name,
 *  version, kibanaVersion, and platform. Mutates the package objects
 *  in the packages array
 * @param {object} settings - a plugin installer settings object
 * @param {array} packages - array of package objects from listPackages()
 */
async function mergePackageData(settings, packages) {
  return packages.map((pkg) => {
    const fullPath = resolve(settings.workingPath, pkg.file);
    const packageInfo = require(fullPath);

    pkg.version = _.get(packageInfo, 'version');
    pkg.name = _.get(packageInfo, 'name');
    pkg.path =  resolve(settings.pluginDir, pkg.name);

    // Plugins must specify their version, and by default that version should match
    // the version of kibana down to the patch level. If these two versions need
    // to diverge, they can specify a kibana.version to indicate the version of
    // kibana the plugin is intended to work with.
    pkg.kibanaVersion = _.get(packageInfo, 'kibana.version', pkg.version);

    const regExp = new RegExp(`${pkg.name}-(.+)`, 'i');
    const matches = pkg.folder.match(regExp);
    pkg.platform = (matches) ? matches[1] : undefined;

    return pkg;
  });
}

/**
 * Extracts the first plugin in the archive.
 *  NOTE: This will need to be changed in later versions of the pack installer
 *  that allow for the installation of more than one plugin at once.
 * @param {object} settings - a plugin installer settings object
 */
async function extractArchive(settings) {
  const filter = {
    paths: [ `kibana/${settings.plugins[0].folder}` ]
  };

  await extractFiles(settings.tempArchiveFile, settings.workingPath, 2, filter);
}


/**
 * Returns the detailed information about each kibana plugin in the pack.
 *  TODO: If there are platform specific folders, determine which one to use.
 * @param {object} settings - a plugin installer settings object
 * @param {object} logger - a plugin installer logger object
 */
export async function getPackData(settings, logger) {
  let packages;
  try {
    logger.log('Retrieving metadata from plugin archive');

    packages = await listPackages(settings);

    await extractPackageFiles(settings, packages);
    await mergePackageData(settings, packages);
    await deletePackageFiles(settings);
  } catch (err) {
    logger.error(err);
    throw new Error('Error retrieving metadata from plugin archive');
  }

  if (packages.length === 0) {
    throw new Error('No kibana plugins found in archive');
  }
  packages.forEach(assertValidPackageName);

  settings.plugins = packages;
}

export async function extract(settings, logger) {
  try {
    logger.log('Extracting plugin archive');

    await extractArchive(settings);

    logger.log('Extraction complete');
  } catch (err) {
    logger.error(err);
    throw new Error('Error extracting plugin archive');
  }
};
