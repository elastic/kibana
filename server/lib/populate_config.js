var _ = require('lodash');
var configFile = require('../../timelion.json');
var flattenWith = require('../../../../src/server/config/flatten_with');

module.exports = function (server) {
  var timelionDefaults = flattenWith('.', configFile);

  // Namespace everything in timelion.json
  timelionDefaults = _.reduce(timelionDefaults, (result, value, key) => {
    result['timelion:' + key] = value;
    return result;
  }, {});

  // Get all existing "advanced settings"
  server.uiSettings().getAll().then((existingSettings) => {

    // Find all timelion settings that don't yet exist in kibana's config
    var missingKeys = _.reduce(timelionDefaults, (result, value, key) => {
      if (existingSettings[key] == null) result.push(key);
      return result;
    }, []);

    // Recursive function writes one of the missing keys at a time
    // If we just spray and pray HTTP requests we will get version conflicts.
    function writeMissing(keys) {

      // Pop one key off the missingKeys array unless it is empty
      if (!keys.length) return;
      var key = keys.pop();
      var timelionDefault = timelionDefaults[key];

      server.uiSettings()
        .set(key, timelionDefault)
        .then(() => writeMissing(keys));
    }

    writeMissing(missingKeys);
  });

};
