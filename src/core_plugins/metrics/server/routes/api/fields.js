import getFields from '../../lib/get_fields';
import Promise from 'bluebird';
export default (server) => {

  server.route({
    path: '/api/metrics/fields',
    method: 'GET',
    handler: (req, reply) => {
      return getFields(req)
        .then(reply)
        .catch(err => reply([]));
    }
  });

};

