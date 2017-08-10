import { getFields } from '../lib/get_fields';
import { getIndexPatternService } from '../lib/get_index_pattern_service';
export default (server) => {

  server.route({
    config: {
      pre: [getIndexPatternService]
    },
    path: '/api/metrics/fields',
    method: 'GET',
    handler: (req, reply) => {
      getFields(req)
        .then(reply)
        .catch((err) => {
          if (err.isBoom && err.status === 401) return reply(err);
          reply([]);
        });
    }
  });

};

