import init from './init';

export default function (kibana) {
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
          const config = server.config();
          const basePath = config.get('server.basePath');

          return {
            kbnIndex: config.get('kibana.index'),
            esShardTimeout: config.get('elasticsearch.shardTimeout'),
            esApiVersion: config.get('elasticsearch.apiVersion'),
            basePath,
          };
        },
      },
      hacks: [
        // Client side plugins go here
        'plugins/canvas/lib/load_expression_types.js',
        'plugins/canvas/lib/load_functions.js',
        'plugins/canvas/lib/load_types.js',
        'plugins/canvas/lib/load_elements.js',
      ],
    },

    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init,
  });
}
