var _ = require('lodash');
var Promise = require('bluebird');
var kibana = require('../../');

module.exports = new kibana.Plugin({
  init: function (server, options) {

    server.route({
      method: 'GET',
      path: '/config',
      handler: function (request, reply) {
        var config = server.config();
        var keys = [
          'kibana_index',
          'default_app_id',
          'shard_timeout'
        ];
        var data = _.pick(config.kibana, keys);
        data.plugins = config.plugins;
        reply(data);
      }
    });

  }
});
