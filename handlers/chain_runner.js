
var _ = require('lodash');
var glob = require('glob');
var Promise = require('bluebird');

var parseSheet = require('./lib/parse_sheet.js');
var parseDateMath = require('../lib/date_math.js');
var loadFunctions = require('../lib/load_functions.js');
var repositionArguments = require('./lib/reposition_arguments.js');
var indexArguments = require('./lib/index_arguments.js');
var getFunctionByName = require('./lib/get_function_by_name.js');
var preprocessChain = require('./lib/preprocess_chain');
var validateTime = require('./lib/validate_time.js');

var functions  = loadFunctions('series_functions');
var fitFunctions  = loadFunctions('fit_functions');

var tlConfig;
var queryCache = {};
var stats = {};
var sheet;

function getQueryCacheKey(query) {
  return JSON.stringify(_.omit(query, 'label'));
}

function throwWithCell(cell, exception) {
  throw new Error(' in cell #' + (cell + 1) + ': ' + exception.message);
}

// Invokes a modifier function, resolving arguments into series as needed
function invoke(fnName, args) {
  var functionDef = getFunctionByName(fnName);

  args = repositionArguments(functionDef, args);
  args = _.map(args, function (item) {
    if (_.isObject(item)) {
      switch (item.type) {
        case 'function':
          var itemFunctionDef = getFunctionByName(item.function);
          if (itemFunctionDef.cacheKey && queryCache[itemFunctionDef.cacheKey(item)]) {
            stats.queryCount++;
            return Promise.resolve(_.cloneDeep(queryCache[itemFunctionDef.cacheKey(item)]));
          }
          return invoke(item.function, item.arguments);
        case 'reference':
          var reference;
          if (item.series) {
            reference = sheet[item.plot - 1][item.series - 1]
          } else {
            reference = {
              type: 'chainList',
              list: sheet[item.plot - 1]
            }
          }
          return invoke('first', [reference]);
        case 'chain':
          return invokeChain(item);
        case 'chainList':
          return resolveChainList(item.list);
        case 'literal':
          return item.value;
        case 'requestList':
        case 'seriesList':
          return item;
      }
      throw new Error ('Argument type not supported: ' + JSON.stringify(item));
    } else {
      return item;
    }
  });


  return Promise.all(args).then(function (args) {
    args.byName = indexArguments(functionDef, args);
    return functionDef.fn(args, tlConfig);
  });
}

function invokeChain(chainObj, result) {
  if (chainObj.chain.length === 0) return result[0];

  var chain = _.clone(chainObj.chain);
  var link = chain.shift();

  var promise;
  if (link.type === 'chain') {
    promise = invokeChain(link);
  } else if (!result) {
    promise = invoke('first', [link]);
  } else {
    var args = link.arguments ? result.concat(link.arguments) : result;
    promise = invoke(link.function, args);
  }

  return promise.then(function (result) {
    return invokeChain({type:'chain', chain: chain}, [result]);
  });

}

function resolveChainList(chainList) {
  var seriesList = _.map(chainList, function (chain) {
    var values = invoke('first', [chain]);
    return values.then(function (args) {
      return args;
    });
  });
  return Promise.all(seriesList).then(function (args) {
    var list = _.chain(args).pluck('list').flatten().value();
    return {type: 'seriesList', list: list};
  });
}

function preProcessSheet(sheet) {

  var queries = {};
  _.each(sheet, function (chainList, i) {
    try {
      var queriesInCell = _.mapValues(preprocessChain(chainList), function (val) {
        val.cell = i;
        return val;
      });
      queries = _.extend(queries, queriesInCell);
    } catch (e) {
      throwWithCell(i, e);
    }
  });
  queries = _.values(queries);

  var promises = _.chain(queries).values().map(function (query) {
    return invoke(query.function, query.arguments);
  }).value();

  return Promise.settle(promises).then(function (resolvedDatasources) {
    stats.queryTime = (new Date()).getTime();

    _.each(queries, function (query, i) {
      var functionDef = getFunctionByName(query.function);
      var resolvedDatasource = resolvedDatasources[i];

      if (resolvedDatasource.isRejected()) {
        if (resolvedDatasource.reason().isBoom) {
          throw resolvedDatasource.reason();
        } else {
          throwWithCell(query.cell, resolvedDatasource.reason());
        }
      }

      queryCache[functionDef.cacheKey(query)] = resolvedDatasource.value();
    });

    stats.cacheCount = _.keys(queryCache).length;
    return queryCache;
  });
}

function processRequest(request) {
  if (!request) throw new Error('Empty request body');

  validateTime(request.time, tlConfig);

  tlConfig.time = request.time;
  tlConfig.time.to = parseDateMath(request.time.to, true).valueOf();
  tlConfig.time.from = parseDateMath(request.time.from).valueOf();
  tlConfig.setTargetSeries();

  stats.invokeTime = (new Date()).getTime();
  stats.queryCount = 0;
  queryCache = {};
  // This is setting the "global" sheet, required for resolving references
  sheet = parseSheet(request.sheet);

  return preProcessSheet(sheet).then(function () {
    return _.map(sheet, function (chainList, i) {
      return resolveChainList(chainList).then(function (seriesList) {
        stats.sheetTime = (new Date()).getTime();
        return seriesList.list;
      }).catch(function (e) {
        throwWithCell(i, e);
      });
    });
  });
}

module.exports = function (_tlConfig_) {
  tlConfig = _tlConfig_;
  return {
    processRequest: processRequest,
    getStats: function () { return stats; }
  };
};

/*
function logObj(obj, thing) {
  return JSON.stringify(obj, null, thing ? ' ' : undefined);
}

function debugSheet(sheet) {
  sheet = processRequest(sheet);
  Promise.all(sheet).then(function (sheet) {
    console.log(logObj(sheet, 1));
    console.log(logObj({done:true}));
    return sheet;
  });
}

debugSheet(
  {sheet:['es(q=-*)'], time: tlConfig.time}
);
*/