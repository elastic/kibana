import fieldsRoutes from './server/routes/fields';
import visDataRoutes from './server/routes/vis';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana','elasticsearch'],

    uiExports: {
      visTypes: [
        'plugins/metrics/kbn_vis_types'
      ]
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        chartResolution: Joi.number().default(150),
        minimumBucketSize: Joi.number().default(10)
      }).default();
    },


    init(server) {
      fieldsRoutes(server);
      visDataRoutes(server);
    }


  });
}
