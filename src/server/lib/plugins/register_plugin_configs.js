var Promise = require('bluebird');
var Joi = require('joi');
/**
 * Execute the #config() call on each of the plugins and attach their schema's
 * to the main config object under their namespace.
 * @param {object} server Kibana server
 * @param {array} plugins Plugins for Kibana
 * @returns {Promise}
 */
module.exports = function (server, plugins) {
  var config = server.config();
  return Promise.each(plugins, function (plugin) {
    return Promise.resolve(plugin.config(Joi)).then(function (schema) {
      var pluginSchema = {};
      if (schema) {
        config.extendSchema(plugin.name, schema);
      }
    });
  }).then(function () {
    return server;
  });
};
