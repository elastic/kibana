<% if (generateApi) { -%>
import exampleRoute from './server/routes/example';

<% } -%>
export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: '<%= snakeCase(name) %>',
    uiExports: {
      <%_ if (generateApp) { -%>
      app: {
        title: '<%= startCase(name) %>',
        description: '<%= description %>',
        main: 'plugins/<%= snakeCase(name) %>/app',
        <%_ if (generateScss) { -%>
        styleSheetPath: require('path').resolve(__dirname, 'public/app.scss'),
        <%_ } -%>
      },
      <%_ } -%>
      <%_ if (generateHack) { -%>
      hacks: [
        'plugins/<%= snakeCase(name) %>/hack'
      ]
      <%_ } -%>
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    <%_ if (generateApi) { -%>

    init(server, options) { // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      exampleRoute(server);
    }
    <%_ } -%>
  });
}
