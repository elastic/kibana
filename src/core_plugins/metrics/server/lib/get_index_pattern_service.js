import { IndexPatternsService } from '../../../../server/index_patterns/service';
export const getIndexPatternService = {
  assign: 'indexPatternsService',
  method(req, reply) {
    const dataCluster = req.server.plugins.elasticsearch.getCluster('data');
    const callDataCluster = (...args) => {
      return dataCluster.callWithRequest(req, ...args);
    };
    reply(new IndexPatternsService(callDataCluster));
  }
};
