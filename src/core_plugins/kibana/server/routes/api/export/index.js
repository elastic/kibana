import { exportDashboards } from '../../../lib/export/export_dashboards';
import { SavedObjectsService } from '../../../../../../../platform/saved_objects';
import Boom from 'boom';
import Joi from 'joi';
import moment from 'moment';
export function exportApi(server) {
  server.route({
    path: '/api/kibana/dashboards/export',
    config: {
      validate: {
        query: Joi.object().keys({
          dashboard: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
          ).required()
        })
      },
      tags: ['api'],
    },
    method: ['GET'],
    handler: (req, reply) => {
      const currentDate = moment.utc();
      const savedObjectsService = new SavedObjectsService(server, req);

      return exportDashboards(req.query.dashboard, server.config(), savedObjectsService)
        .then(resp => {
          const json = JSON.stringify(resp, null, '  ');
          const filename = `kibana-dashboards.${currentDate.format('YYYY-MM-DD-HH-mm-ss')}.json`;
          reply(json)
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .header('Content-Type', 'application/json')
            .header('Content-Length', json.length);
        })
        .catch(err => reply(Boom.boomify(err, { statusCode: 400 })));
    }
  });
}
