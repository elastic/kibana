import getVisData from '../lib/get_vis_data';
import Boom from 'boom';
export default (server) => {

  server.route({
    path: '/api/metrics/vis/data',
    method: 'POST',
    handler: (req, reply) => {
      return getVisData(req)
        .then(reply)
        .catch(err => {
          console.error(err.stack);
          reply(Boom.wrap(err, 400));
        });
    }
  });

};
