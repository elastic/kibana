const fs = require('fs');

export function list(settings, logger) {
  const files = fs.readdirSync(settings.pluginDir);
  files
  .forEach(function (pluginFile) {
    logger.log(pluginFile);
  });
}
