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
        // Dataframes first
        'plugins/rework/arg_types/dataframe/frame_sources/csv/csv',
        'plugins/rework/arg_types/dataframe/frame_sources/timelion/timelion',

        // Then argument types
        'plugins/rework/arg_types/string/string',
        'plugins/rework/arg_types/image/image',
        'plugins/rework/arg_types/select/select',
        'plugins/rework/arg_types/style/style',
        'plugins/rework/arg_types/container_style/container_style',
        'plugins/rework/arg_types/text_style/text_style',

        'plugins/rework/arg_types/dataframe/dataframe',
        'plugins/rework/arg_types/dataframe_column/dataframe_column',


        // Then the elements that use them.
        // Thus, if an element plugin relies on an arg_type plugin,
        // it must declare that requirement in the "require" property above. Neat.
        'plugins/rework/elements/json/json',
        'plugins/rework/elements/box/box',
        'plugins/rework/elements/grow/grow',
        'plugins/rework/elements/circle/circle',

        'plugins/rework/elements/image/image',
        'plugins/rework/elements/number/number',
        'plugins/rework/elements/markdown/markdown',
        'plugins/rework/elements/table/table',
        'plugins/rework/elements/timechart/timechart',



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
