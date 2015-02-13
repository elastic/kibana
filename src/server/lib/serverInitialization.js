var Promise = require('bluebird');
var waitForEs = require('./waitForEs');
var migrateConfig = require('./migrateConfig');

module.exports = function () {
  return waitForEs().then(function () {
    return migrateConfig();
  });
};
