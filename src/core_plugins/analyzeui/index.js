import { resolve } from 'path';
import { analyzeRoute } from './server/routes/analyzeui';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    id: 'analyzeui',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      devTools: ['plugins/analyzeui/app'],
      hacks: ['plugins/analyzeui/register']
    },

    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init: (server) => {
      // Add server routes and initalize the plugin here
      //FIXME should use proxyConfig?
      analyzeRoute(server);
    }
  });
}

