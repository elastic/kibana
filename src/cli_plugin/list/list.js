import { statSync, readdirSync } from 'fs';
import { join } from 'path';

export default function list(settings, logger) {
  readdirSync(settings.pluginDir)
  .forEach((filename) => {
    const stat = statSync(join(settings.pluginDir, filename));

    if (stat.isDirectory() && filename[0] !== '.') {
      logger.log(filename);
    }
  });
  logger.log(''); //intentional blank line for aesthetics
}
