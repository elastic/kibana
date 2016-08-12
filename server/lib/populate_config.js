var _ = require('lodash');
var getNamespacedSettings = require('./get_namespaced_settings');

module.exports = function (server) {

  // Namespace everything in timelion.json
  var timelionDefaults = getNamespacedSettings();

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
