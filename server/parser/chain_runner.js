
var _ = require('lodash');
var glob = require('glob');
var Promise = require('bluebird');

var fs = require('fs');
var grammar = fs.readFileSync('app/scripts/chain.peg', 'utf8');
var PEG = require("pegjs");
var Parser = PEG.buildParser(grammar);
var parseDateMath = require('../utils/date_math.js');


var tlConfig = {
  time: {
    min: parseDateMath('now-18M').valueOf(),
    max: parseDateMath('now').valueOf(),
    field: '@timestamp',
    interval: '1w'
  }
};

var stats = {};

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

function argType (arg) {
  if (_.isObject(arg) && arg) {
    return arg.type;
  }
  if (arg == null) {
    return 'null';
  }
  return typeof arg;
}

function repositionArguments (functionDef, unorderedArgs) {
  var args = [];

  _.each(unorderedArgs, function (unorderedArg, i) {
    if (_.isObject(unorderedArg) && unorderedArg.type === 'namedArg') {

      var argIndex = _.findIndex(functionDef.args, function(orderedArg) {
        return unorderedArg.name === orderedArg.name;
      });

      args[argIndex] = unorderedArg.value;
    } else {
      args[i] = unorderedArg;
    }
  });

  return args;
}

// Invokes a modifier function, resolving arguments into series as needed
function invoke (fnName, args) {
  var functionDef = functions[fnName];
  args = repositionArguments(functionDef, args);
  args = _.map(args, function (item) {

    if (_.isObject(item)) {
      switch (item.type) {
        case 'function':
          if (queryCache[getQueryCacheKey(item)]) {
            stats.queryCount++;
            return Promise.resolve(_.cloneDeep(queryCache[getQueryCacheKey(item)]));
          }
          return invoke(item.function, item.arguments);
        case 'reference':
          var reference = sheet[item.plot - 1][item.series - 1];
          return invokeChain(reference);
        case 'chain':
          return invokeChain(item);
        case 'chainList':
          return resolveChainList(item.list);
        case 'seriesList':
          return item;
      }
      throw new Error ('Argument type not supported: ' + JSON.stringify(item));
    }
    return item;
  });


  return Promise.all(args).then(function (args) {
    if (!functions[fnName]){
      throw new Error('Function not found');
    }

    if (args.length > functionDef.args.length) {
      throw new Error ('Too many arguments passed to: ' + fnName);
    }

    _.each(args, function (arg, i) {
      var type = argType(arg);
      var required = functionDef.args[i].types;
      var name = functionDef.args[i].name;

      if (!(_.contains(required, type))) {
        throw new Error (name + ' must be one of ' + JSON.stringify(required) + '. Got: ' + type);
      }
    });
    return functionDef.fn(args, tlConfig);
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
    promise = invoke('first', [link]);
  } else {
    var args = link.arguments ? result.concat(link.arguments) : result;
    promise = invoke(link.function, args);
  }

  return promise.then(function (result) {
    return invokeChain({type:'chain', chain: chain}, [result]);
  });

}

function resolveChainList (chainList) {
  var seriesList = _.map(chainList, function (chain) {
    var values = invoke('first', [chain]);
    return values.then(function (args) {
      return args;
    });
  });
  return Promise.all(seriesList).then(function (args) {
    var list = _.chain(args).pluck('list').flatten().value();
    return {type: 'seriesList', list: list};
  }).catch(function (e) {throw e;});
}

function logObj(obj, thing) {
  return JSON.stringify(obj, null, thing ? ' ' : undefined);
}

function preProcessSheet (sheet) {
  var queries = [];

  function storeQueryObj(query) {
    var cacheKey = getQueryCacheKey(query);
    queries[cacheKey] = query;
  }

  function validateAndCache(chain) {

    function checkFunc (func) {
      if (_.isObject(func) && func.type === 'function') {
        if (!functions[func.function]) {
          throw new Error('Unknown function: ' + func.function);
        }

        if (functions[func.function].dataSource) {
          storeQueryObj(func);
          return true;
        } else {
          return false;
        }
      }
    }

    if (checkFunc(chain) || !_.isArray(chain)) {
      return;
    }

    _.each(chain, function (operator) {
      if (!_.isObject(operator)) {
        return;
      }
      switch (operator.type) {
      case 'chain':
        validateAndCache(operator.chain);
        break;
      case 'chainList':
        validateAndCache(operator.list);
        break;
      case 'function':
        if (checkFunc(operator)) {
          break;
        } else {
          validateAndCache(operator.arguments);
        }
        break;
      }
    });
  }

  _.each(sheet, function (chainList, index) {
    try {
      validateAndCache(chainList);
    } catch (e) {
      throw {plot: index, name: 'InvalidFunction', exception: e.toString()};
    }
  });

  queries = _.values(queries);

  var promises = _.map(queries, function (item) {
    return invoke(item.function, item.arguments);
  });

  return Promise.all(promises).then(function (results) {
    _.each(queries, function (item, i) {
      queryCache[getQueryCacheKey(item)] = results[i];
    });


    stats.cacheCount = _.keys(queryCache).length;
    stats.queryTime = (new Date()).getTime();
    return queryCache;
  }).catch(function (e) {throw e;});
}



function resolveSheet (sheet) {
  return _.map(sheet, function (plot, index) {
    try {
      return Parser.parse(plot);
    } catch (e) {
      throw {plot: index, name: e.name, exception: 'Expected: ' + e.expected[0].description + ' @ character ' + e.column};
    }
  });
}

function processRequest (request) {
  stats.invokeTime = (new Date()).getTime();
  stats.queryCount = 0;
  queryCache = {};
  // This is setting the "global" sheet
  try {
    sheet = resolveSheet(request);
  } catch (e) {
    return Promise.resolve([e]);
  }

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

function debugSheet (sheet) {
  sheet = processRequest(sheet);
  Promise.all(sheet).then(function (sheet) {
    //console.log(logObj(sheet, 1));
    console.log(logObj({done:true}));
    return sheet;
  });
}

debugSheet(
  ['`*` offset="-1M"']
  //['(`US`).divide((`*`).sum(1000))']
  //['(`*`).divide(100)']
);

