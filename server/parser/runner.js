var aggspretion = require('../parser/grammar.js');
var _ = require('lodash');
var Promise = require('bluebird');
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
});

// Contains the parsed sheet;
var sheet;

function getRequest (config) {
  var body = {
    query: {
      query_string: {
        query: config.query
      }
    },
    aggs: {
      series: {
        date_histogram: {
          field: '@timestamp',
          interval: '2w',
          extended_bounds: {
            min: 1375315200000,
            max: 1435708800000
          },
          min_doc_count: 0
        }
      }
    }
  };

  if (config.field && config.metric) {
    body.aggs.series.aggs = {metric: {}};
    body.aggs.series.aggs.metric[config.metric] = {field: config.field};
  }

  return body;
}

/**
 * Reduces multiple arrays into a single array using a function
 * @param {Array} arrayOfArrays - An array of series to reduce into a single series.
 * @params {Function} fn - Function used to combine points at same index in each array
 * @return {Array} A single series as modified by the fn
 */
function reduce (arrayOfArrays, fn) {
  return Promise.all(arrayOfArrays).then(function (arrayOfArrays) {
    return _.reduce(arrayOfArrays, function(destinationArray, argument) {

      var output = _.map(destinationArray.data, function (point, i) {
        // Allow function to take 2 arrays of equal length, OR an array and a single number;
        // null points are not drawn
        if (point == null) {
          return null;
        }

        if (_.isNumber(argument)) {
          return fn(point, argument);
        }

        if (argument.data[i] == null) {
          return null;
        }

        return fn(point, argument.data[i] || argument);
      });

      // Output = single series

      output = {
        data: output
      };
      output = _.defaults(output, destinationArray);
      return output;

    });
  });
}

function alter (args, fn) {
  return Promise.all(args).then(function (args) {
    return fn(args);
  });
}

/**
 * Modifies an array
 * @param {Array} args - An array of arguments. Usually one or more series, in an array.
 * @return {Array} A single series as modified by the function
 */
var functions = {
  sum: function (args) {
    return reduce(args, function (a, b) {
      return a + b;
    });
  },
  subtract: function (args) {
    return reduce(args, function (a, b) {
      return a - b;
    });
  },
  multiply: function (args) {
    return reduce(args, function (a, b) {
      return a * b;
    });
  },
  divide: function (args) {
    return reduce(args, function (a, b) {
      return a / b;
    });
  },
  roundTo: function (args) {
    return reduce(args, function (a, b) {
      return parseInt(a * Math.pow(10, b), 10) / Math.pow(10, b);
    });
  },
  color: function (args) {
    return alter(args, function (args) {
      args[0].color = args[1];
      return args[0];
    });
  },
  label: function (args) {
    return alter(args, function (args) {
      args[0].label = args[1];
      return args[0];
    });
  },
  attr: function (args) {
    return alter(args, function (args) {
      args[0][args[1]] = args[2];
      return args[0];
    });
  },
  yaxis2: function (args) {
    return alter(args, function (args) {
      args[0].yaxis = 2;
      return args[0];
    });
  },
  first: function (args) {
    return alter(args, function (args) {
      return args[0];
    });
  }
};

var invokeTree;
// Invokes a modifier function, resolving arguments into series as needed
function invoke (fnName, args) {
  args = _.map(args, function (item) {
    if (_.isNumber(item) || _.isString(item)) {
      return item;
    }
    else if (_.isObject(item) && item.type === 'query') {
      return client.search({
        index: 'usagov',
        body:getRequest(item)
      }).then(function (resp) {
        var data;
        if (resp.aggregations.series.buckets[0].metric) {
          data = _.pluck(_.pluck(resp.aggregations.series.buckets, 'metric'), 'value');
        } else {
          data = _.pluck(resp.aggregations.series.buckets, 'doc_count');
        }
        return {data: data};
      });
    }
    else if (_.isObject(item) && item.type === 'function') {
      return invoke(item.function, item.arguments);
    }
    else if (_.isObject(item) && item.type === 'reference') {
      var reference = sheet[item.row - 1][item.column][item.series - 1];
      return invokeTree(reference);
    }
    else {
      throw new Error('Expected function, query, or number');
    }
  });

  return Promise.all(args).then(function (series) {
    if (!functions[fnName]){
      throw new Error('Function not found');
    }
    var output = functions[fnName](series);
    return output;
  });
}

function invokeTree (tree) {
  if (tree.type === 'query' || tree.type === 'reference') {
    // A hack to get invoke to resolve a query not wrapped by a function
    return invoke('first', [tree]);
  }
  return invoke(tree.function, tree.arguments);
}

function resolveExpression (expression) {
  // Forest, a collection of trees
  var forest = expression;

  var keys = client.search({
    index: 'usagov',
    body:getRequest({query: '*'})
  }).then(function (resp) {
    var arr = _.pluck(resp.aggregations.series.buckets, 'key');
    return arr;
  });

  var seriesList = _.map(forest, function (tree) {
    var values = invokeTree(tree);

    // Add keys to series. This could be done further up, should be
    return Promise.all([keys, values]).then(function (args) {
      var output = {
        data: _.zip(args[0], args[1].data)
      };

      output = _.defaults(output, args[1]);
      return output;
    });
  });

  return Promise.all(seriesList).then(function (args) {
    return args;
  }).catch(function () {
    return {};
  });

}

function resolveSheet (sheet) {
  return _.map(sheet, function (row) {
    return _.map(row, function (expression) {
      return aggspretion.parse(expression);
    });
  });
}

function processRequest (request) {
  // This is setting the "global" sheet
  sheet = resolveSheet(request);

  return _.map(sheet, function (row) {
    return _.map(row, function (tree) {
      return Promise.all(resolveExpression(tree)).then(function (columns) {
        return columns;
      });
    });
  });
}

module.exports = processRequest;

/*
module.exports([
  ['`*`','`*`'],
  ['`*`','`*`']
]);
*/