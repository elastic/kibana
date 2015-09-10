
var _ = require('lodash');
var glob = require('glob');
var Promise = require('bluebird');

var parseSheet = require('./lib/parse_sheet.js');
var parseDateMath = require('../lib/date_math.js');
var toMS = require('../lib/to_milliseconds.js');

var loadFunctions = require('../lib/load_functions.js');
var repositionArguments = require('./lib/reposition_arguments.js');
var indexArguments = require('./lib/index_arguments.js');

var buildTarget = require('../lib/build_target.js');
// Load function plugins
var functions  = loadFunctions('series_functions/');
var fitFunctions  = loadFunctions('fit_functions');
var config = require('../timelion.json');

var tlConfig = {
  time: {
    from: 'now-12M',
    to: 'now',
    interval: config.default_interval
  },
  file: config,
  getTargetSeries: function () {
    return _.map(targetSeries, function (bucket) { // eslint-disable-line no-use-before-define
      return [bucket, null];
    });
  }
};
var targetSeries;
var queryCache = {};
var stats = {};
var sheet;

function getQueryCacheKey(query) {
  return JSON.stringify(_.omit(query, 'label'));
}

function getFunctionByName(name) {
  if (!functions[name]) throw new Error ('No such function: ' + name);
  return functions[name];
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
          var reference = sheet[item.plot - 1][item.series - 1];
          return invoke('first', [reference]);
        case 'chain':
          return invokeChain(item);
        case 'chainList':
          return resolveChainList(item.list);
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


function preProcessChain(chain, queries) {
  queries = queries || {};
  function validateAndStore(item) {
    if (_.isObject(item) && item.type === 'function') {
      var functionDef = getFunctionByName(item.function);

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
}

function preProcessSheet(sheet) {

  var queries = {};
  _.each(sheet, function (chainList, i) {
    queries = _.extend(queries, preProcessChain(chainList));
  });
  queries = _.values(queries);

  var promises = _.chain(queries).values().map(function (query) {
    return invoke(query.function, query.arguments);
  }).value();

  return Promise.all(promises).then(function (resolvedDatasources) {
    stats.queryTime = (new Date()).getTime();

    _.each(queries, function (query, i) {

      var functionDef = getFunctionByName(query.function);

      // Fit each series
      resolvedDatasources[i].list = _.map(resolvedDatasources[i].list, function (series) {

        if (series.data.length === 0) throw new Error (functionDef.name + '() returned no results');
        series.data = fitFunctions[series.fit || 'nearest'](series.data, tlConfig.getTargetSeries());
        return series;
      });

      // And cache the fit series.
      queryCache[functionDef.cacheKey(query)] = resolvedDatasources[i];
    });

    stats.fitTime = (new Date()).getTime();

    stats.cacheCount = _.keys(queryCache).length;
    return queryCache;
  });
}

function validateTime(time) {
  var span = parseDateMath(time.to, true) - parseDateMath(time.from);
  var interval = toMS(time.interval);
  var bucketCount = span / interval;
  if (bucketCount > tlConfig.file.max_buckets) {
    throw new Error('Max buckets exceeded: ' +
      Math.round(bucketCount) + ' of ' + tlConfig.file.max_buckets + ' allowed. ' +
      'Choose a larger interval or a shorter time span');
  }
  return true;
}

function processRequest(request) {
  if (!request) throw new Error('Empty request body');

  validateTime(request.time);

  tlConfig.time = request.time;
  tlConfig.time.to = parseDateMath(request.time.to, true).valueOf();
  tlConfig.time.from = parseDateMath(request.time.from).valueOf();


  stats.invokeTime = (new Date()).getTime();
  stats.queryCount = 0;
  queryCache = {};
  // This is setting the "global" sheet, required for resolving references
  sheet = parseSheet(request.sheet);

  targetSeries = buildTarget(tlConfig);

  return preProcessSheet(sheet).then(function () {
    return _.map(sheet, function (chainList) {
      return resolveChainList(chainList).then(function (seriesList) {
        stats.sheetTime = (new Date()).getTime();
        return seriesList.list;
      });
    });
  });
}

module.exports = {
  processRequest: processRequest,
  getStats: function () { return stats; }
};


function logObj(obj, thing) {
  return JSON.stringify(obj, null, thing ? ' ' : undefined);
}

/*
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