import exportDashboards from '../../../lib/export/export_dashboards';
import Boom from 'boom';
import moment from 'moment';
export default function exportApi(server) {
  server.route({
    path: '/api/kibana/export/dashboards',
    method: ['POST', 'GET'],
    handler: (req, reply) => {
      const currentDate = moment.utc();
      return exportDashboards(req)
        .then(resp => {
          const json = JSON.stringify(resp, null, ' ');
          reply(json)
            .header('Content-Disposition', `attachment; filename="kibana-dashboards.${currentDate.format('YYYY-MM-DD-HH-mm-ss')}.json"`)
            .header('Content-Type', 'application/json')
            .header('Content-Length', json.length);
        })
        .catch(err => reply(Boom.wrap(err, 400)));
    }
  });
}
