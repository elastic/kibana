var temp = require('temp');
var fs = require('fs');
var rimraf = require('rimraf');
var fsExtra = require('fs-extra');
var path = require('path');
var join = path.join;
var Promise = require('bluebird');

var writeFile = Promise.promisify(fs.writeFile);
var mkdirTemp = Promise.promisify(temp.mkdir);
var copy = Promise.promisify(fsExtra.copy);
var remove = Promise.promisify(fsExtra.remove);

var tempConfigFolder;
process.on('exit', function () {
  if (tempConfigFolder) {
    rimraf.sync(tempConfigFolder);
  }
});

module.exports = function (config, esPath) {
  return mkdirTemp({prefix: 'libesvm-'}).then(function createConfig(dir) {
    var configFileDestination = path.join(dir, 'elasticsearch.json');

    return Promise.all([
      writeFile(configFileDestination, JSON.stringify(config), 'utf8'),
      copy(join(esPath, 'config'), dir)
    ])
    .then(function () {
      return remove(join(dir, 'elasticsearch.yml'));
    })
    .thenReturn(dir);
  });
};
