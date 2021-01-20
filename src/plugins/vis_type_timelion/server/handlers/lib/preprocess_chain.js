/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

export default function preProcessChainFn(tlConfig) {
  return function preProcessChain(chain, queries) {
    queries = queries || {};
    function validateAndStore(item) {
      if (_.isObject(item) && item.type === 'function') {
        const functionDef = tlConfig.getFunction(item.function);

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

    if (!Array.isArray(chain)) return;

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
}
