var waitForAWS = require('./waitForAWS');

module.exports = function () {
  return waitForAWS().then(
    function() {
      var waitForEs = require('./waitForEs');
      return waitForEs();
  }).then(
    function () {
      var migrateConfig = require('./migrateConfig');
      var client = require('./elasticsearch_client');
      return migrateConfig(client);
    });
};
