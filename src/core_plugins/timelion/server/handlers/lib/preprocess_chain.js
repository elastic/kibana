import _ from 'lodash';

module.exports = function preProcessChainFn(tlConfig) {
  return function preProcessChain(chain, queries) {
    queries = queries || {};
    function validateAndStore(item) {
      if (_.isObject(item) && item.type === 'function') {
        const functionDef = tlConfig.server.plugins.timelion.getFunction(item.function);

        if (functionDef.datasource) {
          queries[functionDef.cacheKey(item)] = item;
          return true;
        }
        return false;
      }
    }

    // Is this thing a function?
    if (validateAndStore(chain)) {
      return;
    }

    if (!_.isArray(chain)) return;

    _.each(chain, function (operator) {
      if (!_.isObject(operator)) {
        return;
      }
      switch (operator.type) {
        case 'chain':
          preProcessChain(operator.chain, queries);
          break;
        case 'chainList':
          preProcessChain(operator.list, queries);
          break;
        case 'function':
          if (validateAndStore(operator)) {
            break;
          } else {
            preProcessChain(operator.arguments, queries);
          }
          break;
      }
    });

    return queries;
  };
};
