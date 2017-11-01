import init from './init';
import { functionsRegistry } from './common/lib/functions_registry';

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
        uses: [
          'visTypes',
          'visResponseHandlers',
          'visRequestHandlers',
          'visEditorTypes',
          'savedObjectTypes',
          'spyModes',
          'fieldFormats',
        ],
        injectVars: (server) => {
          const config = server.config();
          const basePath = config.get('server.basePath');

          const kibanaVars = server.plugins.kibana.injectVars(server);

          return {
            ...kibanaVars,
            kbnIndex: config.get('kibana.index'),
            esShardTimeout: config.get('elasticsearch.shardTimeout'),
            esApiVersion: config.get('elasticsearch.apiVersion'),
            serverFunctions: functionsRegistry.toArray(),
            basePath,
          };
        },
      },
      hacks: [
        // window.onerror override
        'plugins/canvas/lib/window_error_handler.js',

        // Client side plugins go here
        'plugins/canvas/lib/load_expression_types.js',
        'plugins/canvas/lib/load_functions.js',
        'plugins/canvas/lib/load_types.js',
        'plugins/canvas/lib/load_render_functions.js',
        'plugins/canvas/lib/load_elements.js',
        'plugins/canvas/hacks/jquery.flot.js',
        'plugins/canvas/hacks/jquery.flot.pie.js',
        'plugins/canvas/hacks/jquery.flot.stack.js',
        'plugins/canvas/hacks/jquery.flot.time.js',

      ],
    },

    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        indexPrefix: Joi.string().default('.canvas'),
      }).default();
    },

    init,
  });
}
