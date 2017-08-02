import { IndexPatternsService } from './service';

import {
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
      method(request, reply) {
        reply(request.getIndexPatternsService());
      }
    }
  };

  /**
   *  Create an instance of the IndexPatternsService
   *
   *  @method server.indexPatternsServiceFactory
   *  @type {IndexPatternsService}
   */
  server.decorate('server', 'indexPatternsServiceFactory', ({ callCluster }) => {
    return new IndexPatternsService(callCluster);
  });

  /**
   *  Get an instance of the IndexPatternsService configured for use
   *  the current request
   *
   *  @method request.getIndexPatternsService
   *  @type {IndexPatternsService}
   */
  server.addMemoizedFactoryToRequest('getIndexPatternsService', request => {
    const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');
    const callCluster = (...args) => callWithRequest(request, ...args);
    return server.indexPatternsServiceFactory({ callCluster });
  });

  server.route(createFieldsForWildcardRoute(pre));
  server.route(createFieldsForTimePatternRoute(pre));
}
