import exportDashboards from '../../../lib/export/export_dashboards';
import Boom from 'boom';
export default function exportApi(server) {
  server.route({
    path: '/api/kibana/export/dashboards',
    method: ['POST', 'GET'],
    handler: (req, reply) => {
      return exportDashboards(req)
        .then(resp => {
          const json = JSON.stringify(resp, null, ' ');
          reply(json)
            .header('Content-Disposition', 'attachment; filename="kibana-dashboards.json"')
            .header('Content-Type', 'application/json')
            .header('Content-Length', json.length);
        })
        .catch(err => {
          reply(Boom.wrap(err, 400));
        });
    }
  });
}
