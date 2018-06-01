<% if (generateTranslations) { %>import { resolve } from 'path';<% } %>
<% if (generateApi) { %>import exampleRoute from './server/routes/example';<% } %>

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: '<%= this.kebabCase(name) %>',
    uiExports: {
      <% if (generateApp) { %>
      app: {
        title: '<%= this.startCase(name) %>',
        description: '<%= description %>',
        main: 'plugins/<%= this.kebabCase(name) %>/app'
      },
      <% } %>
      <% if (generateTranslations) { %>
      translations: [
        resolve(__dirname, './translations/es.json')
      ],
      <% } %>
      <% if (generateHack) { %>
      hacks: [
        'plugins/<%= name %>/hack'
      ]
      <% } %>
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    <% if (generateApi) { %>
    init(server, options) {
      // Add server routes and initialize the plugin here
      exampleRoute(server);
    }
    <% } %>

  });
};
