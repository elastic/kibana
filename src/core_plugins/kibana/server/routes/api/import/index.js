import Boom from 'boom';
import Joi from 'joi';
import { importDashboards } from '../../../lib/import/import_dashboards';

export function importApi(server) {
  server.route({
    path: '/api/kibana/dashboards/import',
    method: ['POST'],
    config: {
      validate: {
        payload: Joi.object().keys({
          objects: Joi.array(),
          version: Joi.string()
        }),
        query: Joi.object().keys({
          force: Joi.boolean().default(false),
          exclude: [Joi.string(), Joi.array().items(Joi.string())]
        })
      },
    },

    handler: (req, reply) => {
      return importDashboards(req)
        .then((resp) => reply(resp))
        .catch(err => reply(Boom.wrap(err, 400)));
    }
  });
}
