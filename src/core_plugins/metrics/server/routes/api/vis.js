import getVisData from '../../lib/get_vis_data';
import _ from 'lodash';
import Boom from 'boom';
export default (server) => {

  server.route({
    path: '/api/metrics/vis/data',
    method: 'POST',
    handler: (req, reply) => {
      const reqs = req.payload.panels.map(getVisData(req));
      return Promise.all(reqs)
        .then(res => {
          return res.reduce((acc, data) => {
            return _.assign({}, acc, data);
          }, {});
        })
        .then(reply)
        .catch(err => {
          console.error(err.stack);
          reply(Boom.wrap(err, 400));
        });
    }
  });

};
