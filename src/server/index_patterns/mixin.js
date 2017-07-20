import { IndexPatternsService } from './service';

import {
  createTestTimePatternRoute,
  createFieldsForWildcardRoute,
  createFieldsForTimePatternRoute,
} from './routes';

export function indexPatternsMixin(kbnServer, server) {
  const pre = {
    /**
    *  Create an instance of the `indexPatterns` service
    *  @type {Hapi.Pre}
    */
    getIndexPatternsService: {
      assign: 'indexPatterns',
      method(req, reply) {
        const dataCluster = req.server.plugins.elasticsearch.getCluster('data');
        const callDataCluster = (...args) => (
          dataCluster.callWithRequest(req, ...args)
        );

        reply(new IndexPatternsService(callDataCluster));
      }
    }
  };

  server.route(createTestTimePatternRoute(pre));
  server.route(createFieldsForWildcardRoute(pre));
  server.route(createFieldsForTimePatternRoute(pre));
}
