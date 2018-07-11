import exampleRoute from './server/routes/example';
import lspRoute from './server/routes/lsp';
import repositoryRoute from './server/routes/repository';

import mappings from './mappings';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'castro',
    uiExports: {
      
      app: {
        title: 'Castro',
        description: 'castro',
        main: 'plugins/castro/app'
      },
      
      hacks: [
        'plugins/castro/hack'
      ],

      mappings
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        index: Joi.string().default('.castro'),
        dataPath: Joi.string().default('/tmp')
      }).default();
    },

    init(server, options) {
      // TODO:Prepare elasticsearch index for castro if necessary.
      // const es = server.plugins.elasticsearch.getCluster("data");
      // const index = server.config().get('castro.index');

      // Add server routes and initialize the plugin here
      exampleRoute(server);
      lspRoute(server);
      repositoryRoute(server);
    },

  });
};
