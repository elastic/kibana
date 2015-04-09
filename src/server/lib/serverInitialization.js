var waitForEs = require('./waitForEs');
var migrateConfig = require('./migrateConfig');
var client = require('./elasticsearch_client');

module.exports = function () {
  return waitForEs().then(function () {
    return migrateConfig(client);
  });
};
