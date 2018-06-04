import exampleRoute from './server/routes/example';

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
      ]
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    
    init(server, options) {
      // Add server routes and initialize the plugin here
      exampleRoute(server);
    }
    

  });
};
