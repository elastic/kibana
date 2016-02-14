import fs from 'fs';

export function list(settings, logger) {
  fs.readdirSync(settings.pluginDir)
  .forEach(function (pluginFile) {
    logger.log(pluginFile);
  });
}
