
var _ = require('lodash');
var glob = require('glob');
var Promise = require('bluebird');

var fs = require('fs');
var grammar = fs.readFileSync('app/scripts/chain.peg', 'utf8');
var PEG = require("pegjs");
var Parser = PEG.buildParser(grammar);

var fetchData = require('./fetch_data.js');

// Load function plugins
var functions  = _.chain(glob.sync('server/series_functions/*.js')).map(function (file) {
  var fnName = file.substring(file.lastIndexOf('/')+1, file.lastIndexOf('.'));
  return [fnName, require('../series_functions/' + fnName + '.js')];
}).zipObject().value();

function getQueryCacheKey (query) {
  return JSON.stringify(_.omit(query, 'label'));
}

var sheet;
var queryCache = {};
// Invokes a modifier function, resolving arguments into series as needed
function invoke (fnName, args) {
  console.log(fnName + '::: ' + JSON.stringify(args, null, ' '));

  args = _.map(args, function (item) {
    if (_.isObject(item)) {
      switch (item.type) {
        case 'query':
          var cacheKey = getQueryCacheKey(item);
          if (queryCache[cacheKey]) {
            return Promise.resolve(_.clone(queryCache[cacheKey]));
          }
          return fetchData(item, cacheKey);
          //throw new Error ('Missing query cache! ' + cacheKey);
        case 'function':
          return invoke(item.function, item.arguments);
        case 'reference':
          var reference = sheet[item.plot - 1][item.series - 1];
          return invokeChain(reference);
        case 'chain':
          return invokeChain(item);
        case 'seriesList':
          return resolveChainList(item.list);
      }
      throw new Error ('Argument type not supported: ' + JSON.stringify(item));
    }
    return item;
  });


  return Promise.all(args).then(function (series) {
    if (!functions[fnName]){
      throw new Error('Function not found');
    }
    var output = functions[fnName](series);
    return output;
  });
}

function invokeChain (chainObj, result) {
  if (chainObj.chain.length === 0) {
    return result[0];
  }

  var chain = _.clone(chainObj.chain);
  var link = chain.shift();

  var promise;
  if (link.type === 'chain') {
    promise = invokeChain(link);
  } else if (!result) {
    if (link.label) {
      promise = invoke('label', [link, link.label, true]);
    } else {
      promise = invoke('first', [link]);
    }
  } else {
    promise = invoke(link.function, result.concat(link.arguments));
  }

  return promise.then(function (result) {
    return invokeChain({type:'chain', chain: chain}, [result]);
  });

}

function resolveChainList (chainList) {
  var seriesList = _.map(chainList, function (chain) {
    var values = invoke('first', [chain]);

    return values.then(function (args) {
      //args.data = unzipPairs(args.data);
      return args;
    });
  });
  return Promise.all(seriesList).then(function (args) {
    return args;
  }).catch(function () {
    return {};
  });

}

function preProcessSheet (sheet) {
  var queries = {};

  function findQueries(chain) {
    _.each(chain, function (operator) {
      if (!_.isObject(operator)) {
        return;
      }
      if (operator.type === 'chain') {
        findQueries(operator.chain);
      } else if (operator.type === 'function') {
        findQueries(operator.arguments);
      } else if (operator.type === 'query') {
        var cacheKey = getQueryCacheKey(operator);
        queries[cacheKey] = operator;
      }
    });
  }

  _.each(sheet, function (chainList) {
    findQueries(chainList);
  });

  var promises = _.map(queries, function (item, cacheKey) {
    return fetchData(item, cacheKey);
  });

  return Promise.all(promises).then(function (results) {
    _.each(results, function (result) {
      queryCache[result.cacheKey] = result;
    });
    return queryCache;
  });
}

function resolveSheet (sheet) {
  return _.map(sheet, function (plot, index) {
    try {
      return Parser.parse(plot);
    } catch (e) {
      throw {plot: index, exception: e};
    }

  });
}

function deepFindByProp (obj, property, list) {
  list = list || [];
  if (_.has(obj, property)) {
    list.push(obj);
    return list;
  }
  return list.concat(_.flatten(_.map(obj, function (elem) {
    return deepFindByProp(elem, property);
  })));

}

function processRequest (request) {
  queryCache = {};
  // This is setting the "global" sheet
  try {
    sheet = resolveSheet(request);
  } catch (e) {
    return Promise.resolve([e]);
  }

  return preProcessSheet(sheet).then(function () {
    return _.map(sheet, function (chainList) {
      return resolveChainList(chainList).then(function (plots) {
        console.log(plots);
        return deepFindByProp(plots, 'data');
      });
    });
  });
}

module.exports = processRequest;

function debugSheet (sheet) {
  sheet = processRequest(sheet);
  Promise.all(sheet).then(function (sheet) {
    //console.log(JSON.stringify(sheet));
    return sheet;
  });
}

debugSheet(
  ['(`US`,`JP`)']
  //['(`US`).divide((`*`).sum(1000))']
  //['(`*`).divide(100)']
);

