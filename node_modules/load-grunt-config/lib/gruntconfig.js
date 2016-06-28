var readConfigDir = require('./readconfigdir');
var _ = require('lodash');

module.exports = function(grunt, options) {
  var merge = options.mergeFunction || _.merge;
  return _([[options.configPath], [options.overridePath]])
    .flattenDeep()
    .compact()
    .reduce(function (config, configPath) {
      var overrideConfig = readConfigDir(configPath, grunt, options);
      return merge(config, overrideConfig);
    }, {});
};
