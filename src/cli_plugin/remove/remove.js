import { statSync } from 'fs';
import rimraf from 'rimraf';

export default function remove(settings, logger) {
  try {
    let stat;
    try {
      stat = statSync(settings.pluginPath);
    } catch (e) {
      throw new Error(`Plugin [${settings.plugin}] is not installed`);
    }

    if (!stat.isDirectory()) {
      throw new Error(`[${settings.plugin}] is not a plugin`);
    }

    logger.log(`Removing ${settings.plugin}...`);
    rimraf.sync(settings.pluginPath);
  } catch (err) {
    logger.error(`Unable to remove plugin because of error: "${err.message}"`);
    process.exit(74); // eslint-disable-line no-process-exit
  }
}
