var _ = require('lodash');
var Promise = require('bluebird');
var kibana = require('../../');
var listPlugins = require('../../lib/plugins/list_plugins');

module.exports = new kibana.Plugin({
  init: function (server, options) {

    server.route({
      method: 'GET',
      path: '/config',
      handler: function (request, reply) {
        var config = server.config();
        reply({
          kibana_index: config.get('kibana.index'),
          default_app_id: config.get('kibana.defaultAppId'),
          shard_timeout: config.get('elasticsearch.sharedTimeout'),
          plugins: listPlugins(config)
        });
      }
    });

  }
});
