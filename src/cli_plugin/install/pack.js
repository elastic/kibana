import _ from 'lodash';
import { listFiles, extractFiles } from './zip';
import { resolve } from 'path';
import { sync as rimrafSync } from 'rimraf';

//*****************************************
//Return a list of package.json files in the archive
//*****************************************
async function listPackages(settings) {
  const regExp = new RegExp('(kibana/([^/]+))/package.json', 'i');
  const archiveFiles = await listFiles(settings.tempArchiveFile);

  let packages = archiveFiles.map((file) => {
    file = file.replace(/\\/g, '/');
    const matches = file.match(regExp);
    if (matches) {
      return {
        file: matches[0],
        folder: matches[2]
      };
    }
  });

  packages = _.chain(packages).compact().uniq().value();

  return packages;
}

//*****************************************
//Extract the package.json files into the workingPath
//*****************************************
async function extractPackageFiles(settings, packages) {
  const filter = {
    files: packages.map((pkg) => pkg.file)
  };
  await extractFiles(settings.tempArchiveFile, settings.workingPath, 0, filter);
}

//*****************************************
//Extract the package.json files into the workingPath
//*****************************************
function deletePackageFiles(settings, packages) {
  packages.forEach((pkg) => {
    const fullPath = resolve(settings.workingPath, 'kibana');
    rimrafSync(fullPath);
  });
}

//*****************************************
//Examine each package.json file to determine the plugin name,
//version, and platform.
//*****************************************
async function readPackageData(settings, packages) {
  return packages.map((pkg) => {
    const fullPath = resolve(settings.workingPath, pkg.file);
    const packageInfo = require(fullPath);

    pkg.version = _.get(packageInfo, 'version');
    pkg.name = _.get(packageInfo, 'name');
    pkg.path =  resolve(settings.pluginDir, pkg.name);

    const regExp = new RegExp(`${pkg.name}-(.+)`, 'i');
    const matches = pkg.folder.match(regExp);
    pkg.platform = (matches) ? matches[1] : undefined;

    return pkg;
  });
}

//*****************************************
//Extracts the first plugin in the archive.
//This will need to be changed in later versions of the pack installer
//that allow for the installation of more than one plugin at once.
//*****************************************
async function extractArchive(settings) {
  const filter = {
    paths: [ settings.plugins[0].folder ]
  };
  await extractFiles(settings.tempArchiveFile, settings.workingPath, 2, filter);
}

//*****************************************
//Returns the detailed information about each kibana plugin in the
//pack.
//TODO: If there are platform specific folders, determine which one to use.
//*****************************************
export async function getPackData(settings, logger) {
  let packages;
  try {
    logger.log('Retrieving metadata from plugin archive');

    packages = await listPackages(settings);
    await extractPackageFiles(settings, packages);
    await readPackageData(settings, packages);
    await deletePackageFiles(settings, packages);
  } catch (err) {
    logger.error(err);
    throw new Error('Error retrieving metadata from plugin archive');
  }

  if (packages.length === 0) {
    throw new Error('No kibana plugins found in archive');
  }

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
