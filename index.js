var path = require('path');

module.exports = function (kibana) {
  return new kibana.Plugin({
    name: 'rework',
    require: ['kibana', 'elasticsearch', 'timelion'],
    uiExports: {
      app: {
        title: 'The Rework',
        description: 'Weeeeee',
        icon: 'plugins/rework/icon.svg',
        main: 'plugins/rework/app',
        injectVars: function (server) {
          var config = server.config();
          var basePath = config.get('server.basePath');

          return {
            kbnIndex: config.get('kibana.index'),
            esShardTimeout: config.get('elasticsearch.shardTimeout'),
            esApiVersion: config.get('elasticsearch.apiVersion'),
            basePath
          };
        }
      },
      hacks: [
        // You must load the argTypes first
        'plugins/rework/arg_types/string/string',
        'plugins/rework/arg_types/style/style',

        // Then the elements that use them.
        // Thus, if an element plugin relies on an arg_type plugin,
        // it must declare that requirement in the "require" property above. Neat.
        'plugins/rework/elements/json/json',
        'plugins/rework/elements/box/box',


      ],
    },

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init: require('./init')

  });
};
