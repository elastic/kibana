import _ from 'lodash';
import DecompressZip from '@bigfunger/decompress-zip';

async function extractArchive(settings) {
  await new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(settings.tempArchiveFile);

    unzipper.on('error', reject);

    unzipper.extract({
      path: settings.workingPath,
      strip: 2,
      filter(file) {
        let extract = false;
        const pathFilters = [ `kibana/${settings.plugin}` ];

        pathFilters.forEach((pathFilter) => {
          const regExString = pathFilter + '($|/)';
          const regex = new RegExp(regExString, 'i');
          if ((file.parent.match(regex)) && file.type !== 'SymbolicLink') {
            extract = true;
          }
        });

        return extract;
      }
    });

    unzipper.on('extract', resolve);
  });
}

async function getPluginNamesFromArchive(settings) {
  const plugins = await new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(settings.tempArchiveFile);

    unzipper.on('error', reject);

    unzipper.on('list', (files) => {
      const regExp = new RegExp('kibana/([^/]+)');

      files = files.map(file => file.replace(/\\/g, '/'));

      const duplicatedNames = files.map((file) => {
        const matches = file.match(regExp);
        if (matches) return matches[1];
      });

      const pluginNames = _.chain(duplicatedNames).compact().uniq().value();
      resolve(pluginNames);
    });

    unzipper.list();
  });

  return plugins;
}

export async function readMetadata(settings, logger) {
  let pluginNames;  try {
    logger.log('Retrieving metadata from plugin archive');

    pluginNames = await getPluginNamesFromArchive(settings);
  } catch (err) {
    logger.error(err);
    throw new Error('Error retrieving metadata from plugin archive');
  }

  if (pluginNames.length === 0) {
    throw new Error('No kibana plugins found in archive');
  }

  settings.setPlugin(pluginNames[0]);
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
