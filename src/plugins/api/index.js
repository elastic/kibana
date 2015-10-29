import indexPatternEndpoints from './index_pattern_endpoints';

module.exports = function (kibana) {

  return new kibana.Plugin({

    init: function (server, options) {

      indexPatternEndpoints(server);
    }
  });
};
