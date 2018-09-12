import init from './init';
import { mappings } from './server/mappings';
import { CANVAS_APP } from './common/lib/constants';

export default function(kibana) {
  return new kibana.Plugin({
    name: CANVAS_APP,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      app: {
        title: 'Canvas',
        description: 'Data driven workpads',
        icon: 'plugins/canvas/icon.svg',
        main: 'plugins/canvas/app',
        styleSheetPath: `${__dirname}/public/style/index.scss`,
      },
      hacks: [
        // window.onerror override
        'plugins/canvas/lib/window_error_handler.js',

        // Client side plugins go here
        'plugins/canvas/lib/load_expression_types.js',
        'plugins/canvas/lib/load_transitions.js',
      ],
      mappings,
    },

    config: Joi => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        indexPrefix: Joi.string().default('.canvas'),
      }).default();
    },

    init,
  });
}
