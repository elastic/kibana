import { exportDashboards } from '../../../lib/export/export_dashboards';
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
    },
    method: ['GET'],
    handler: (req, reply) => {
      const currentDate = moment.utc();
      return exportDashboards(req)
        .then(resp => {
          const json = JSON.stringify(resp, null, '  ');
          const filename = `kibana-dashboards.${currentDate.format('YYYY-MM-DD-HH-mm-ss')}.json`;
          reply(json)
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .header('Content-Type', 'application/json')
            .header('Content-Length', json.length);
        })
        .catch(err => reply(Boom.wrap(err, 400)));
    }
  });
}
