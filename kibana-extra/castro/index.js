import exampleRoute from './server/routes/example';
import personRoute from './server/routes/person';

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
        fromyaml: Joi.string().default('empty')
      }).default();
    },

    
    init(server, options) {
      // Add server routes and initialize the plugin here
      exampleRoute(server);
      personRoute(server);
    }
    

  });
};
