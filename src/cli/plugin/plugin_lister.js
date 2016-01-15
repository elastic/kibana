const fs = require('fs');

export function list(settings, logger) {
  const files = fs.readdirSync(settings.pluginDir);
  files
  .filter(function (file) {
    return file[0] !== '.';
  })
  .forEach(function (pluginFile) {
    logger.log(pluginFile);
  });
}
