import Boom from 'boom';
import importDashboards from '../../../lib/import/import_dashboards';
export default function importApi(server) {
  server.route({
    path: '/api/kibana/import/dashboards',
    method: ['POST'],
    handler: (req, reply) => {
      return importDashboards(req)
        .then((resp) => reply(resp))
        .catch(err => reply(Boom.wrap(err, 400)));
    }
  });
}
