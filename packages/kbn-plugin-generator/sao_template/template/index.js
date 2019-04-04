<% if (generateScss) { -%>
import { resolve } from 'path';
import { existsSync } from 'fs';

<% } -%>

<% if (generateFeatureRegistration) { -%>
import { i18n } from '@kbn/i18n';
<% } -%>

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
      },
      <%_ } -%>
      <%_ if (generateHack) { -%>
      hacks: [
        'plugins/<%= snakeCase(name) %>/hack'
      ],
      <%_ } -%>
      <%_ if (generateScss) { -%>
      styleSheetPaths: [resolve(__dirname, 'public/app.scss'), resolve(__dirname, 'public/app.css')].find(p => existsSync(p)),
      <%_ } -%>
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    <%_ if (generateApi || generateFeatureRegistration) { -%>

    init(server, options) { // eslint-disable-line no-unused-vars
      <%_ if (generateFeatureRegistration) { -%>
        const xpackMainPlugin = server.plugins.xpack_main;
        if (xpackMainPlugin) {
          const featureId = '<%= snakeCase(name) %>';

          xpackMainPlugin.registerFeature({
            id: featureId,
            name: i18n.translate('<%= camelCase(name) %>.featureRegistry.featureName', {
              defaultMessage: '<%= name %>',
            }),
            navLinkId: featureId,
            icon: 'discoverApp',
            <%_ if (generateApp) { -%>
            app: [featureId, 'kibana'],
            <%_ } -%>
            <%_ if (!generateApp) { -%>
            app: ['kibana'],
            <%_ } -%>
            catalogue: [],
            privileges: {
              all: {
                api: [],
                savedObject: {
                  all: [],
                  read: ['config'],
                },
                ui: ['show'],
              },
              read: {
                api: [],
                savedObject: {
                  all: [],
                  read: ['config'],
                },
                ui: ['show'],
              },
            },
          });
        }
      <%_ } -%>
      <%_ if (generateApi) { -%>
      // Add server routes and initialize the plugin here
      exampleRoute(server);
      <%_ } -%>
    }
    <%_ } -%>
  });
}
