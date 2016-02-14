import fs from 'fs';

export default function list(settings, logger) {
  fs.readdirSync(settings.pluginDir)
  .forEach((filename) => {
    if (filename[0] !== '.') {
      logger.log(filename);
    }
  });
  logger.log('');
}
