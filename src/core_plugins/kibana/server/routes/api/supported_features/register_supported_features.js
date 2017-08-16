import _ from 'lodash';

import { getSupportedFeatures } from '../../../lib/supported_features';


export function registerSupportedFeatures(server) {
  server.route({
    path: '/api/kibana/supported_features',
    method: 'GET',
    handler: function (request, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const supportedFeatures = getSupportedFeatures(_.partial(callWithRequest, request));

      reply(supportedFeatures);
    }
  });
}
