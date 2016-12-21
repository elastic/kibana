import fieldsRoutes from './server/routes/api/fields';
import visDataRoutes from './server/routes/api/vis';
import Promise from 'bluebird';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana','elasticsearch'],

    uiExports: {
      visTypes: [
        'plugins/metrics/vis'
      ]
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        chartResolution: Joi.number().default(150),
        minimumBucketSize: Joi.number().default(10)
      }).default();
    },


    init(server, options) {
      const config = server.config();
      const { status } = server.plugins.elasticsearch;

      fieldsRoutes(server);
      visDataRoutes(server);
    }


  });
}
