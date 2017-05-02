module.exports = function (kibana) {
  return new kibana.Plugin({
    name: 'canvas',
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        title: 'Canvas',
        description: 'Data driven workpads',
        icon: 'plugins/canvas/icon.svg',
        main: 'plugins/canvas/app',
        injectVars: (server) => {
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
        // Plugins go here
      ],
    },

    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init: require('./init')

  });
};
