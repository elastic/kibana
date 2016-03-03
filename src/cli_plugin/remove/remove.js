import fs from 'fs';
import rimraf from 'rimraf';

export default function remove(settings, logger) {
  try {
    try {
      fs.statSync(settings.pluginPath);
    } catch (e) {
      logger.log(`Plugin ${settings.plugin} is not installed`);
      return;
    }

    logger.log(`Removing ${settings.plugin}...`);
    rimraf.sync(settings.pluginPath);
  } catch (err) {
    logger.error(`Unable to remove plugin "${settings.plugin}" because of error: "${err.message}"`);
    process.exit(74); // eslint-disable-line no-process-exit
  }
}
