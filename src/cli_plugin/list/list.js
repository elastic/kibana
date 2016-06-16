import { statSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export default function list(settings, logger) {
  readdirSync(settings.pluginDir)
  .forEach((filename) => {
    const stat = statSync(join(settings.pluginDir, filename));

    if (stat.isDirectory() && filename[0] !== '.') {
      try {
        const packagePath = join(settings.pluginDir, filename, 'package.json');
        const { version } = JSON.parse(readFileSync(packagePath, 'utf8'));
        logger.log(filename + '@' + version);
      } catch (e) {
        throw new Error('Unable to read package.json file for plugin ' + filename);
      }
    }
  });
  logger.log(''); //intentional blank line for aesthetics
}
