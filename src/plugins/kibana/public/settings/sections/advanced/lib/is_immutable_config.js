define(function (require) {
  var _ = require('lodash');

  var IMMUTABLE_CONFIG_VALS = ['buildNum'];

  /**
   * @param {string} name of configuration
   * @returns {boolean} whether the given name matches an immutable field name
   */
  function isImmutableConfig(configName) {
    return _.contains(IMMUTABLE_CONFIG_VALS, configName);
  }

  return isImmutableConfig;
});
