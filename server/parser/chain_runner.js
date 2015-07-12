var Parser = require('../parser/chain.js');
var unzipPairs = require('../utils/unzipPairs.js');

var _ = require('lodash');
var glob = require('glob');
var Promise = require('bluebird');
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
});

// Load function plugins
var functions  = _.chain(glob.sync('server/functions/*.js')).map(function (file) {
  var fnName = file.substring(file.lastIndexOf('/')+1, file.lastIndexOf('.'));
  return [fnName, require('../functions/' + fnName + '.js')];
}).zipObject().value();

// Contains the parsed sheet;
var sheet;

var time = {
  min: 'now-2y',
  max: 'now',
  field: '@timestamp',
  interval: '1w'
};

function getRequest (config) {
  var filter = {range:{}};
  filter.range[time.field] = {gte: time.min, lte: time.max};

  var body = {
    query: {
      filtered: {
        query: {
          query_string: {
            query: config.query
          }
        },
        filter: filter
      }
    },
    aggs: {
      series: {
        date_histogram: {
          field: time.field,
          interval: time.interval,
          extended_bounds: {
            min: time.min,
            max: time.max
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
        filterPath: 'aggregations.series.buckets.key,aggregations.series.buckets.doc_count,aggregations.series.buckets.metric.value',
        searchType: 'count',
        body:getRequest(item)
      }).then(function (resp) {
        var values;
        var keys = _.pluck(resp.aggregations.series.buckets, 'key');
        if (resp.aggregations.series.buckets[0].metric) {
          values = _.chain(resp.aggregations.series.buckets).pluck('metric').pluck('value').value();
        } else {
          values = _.pluck(resp.aggregations.series.buckets, 'doc_count');
        }
        var data = _.zipObject(keys, values);
        return { data:  data};
      }).catch(function (e) {
        throw new Error(e.message.root_cause[0].reason);
      });
    }
    else if (_.isObject(item) && item.type === 'function') {
      return invoke(item.function, item.arguments);
    }
    else if (_.isObject(item) && item.type === 'reference') {
      var reference = sheet[item.row - 1][item.column][item.series - 1];
      return invokeTree(reference);
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

function invokeTree (chain, result) {
  if (chain.length === 0) {
    return result[0];
  }

  chain = _.clone(chain);
  var link = chain.shift();
  var promise;
  if (!result) {
    if (link.label) {
      promise = invoke('label', [link, link.label, true]);
    } else {
      promise = invoke('first', [link]);
    }
  } else {
    promise = invoke(link.function, result.concat(link.arguments));
  }

  return promise.then(function (result) {
    return invokeTree(chain, [result]);
  });

}

function resolveTree (forest) {
  var seriesList = _.map(forest, function (tree) {
    var values = invokeTree(tree);

    return values.then(function (args) {
      args.data = unzipPairs(args.data);
      return args;
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
    return _.map(row, function (column) {
      return Parser.parse(column);
    });
  });
}

function processRequest (request) {
  // This is setting the "global" sheet
  sheet = resolveSheet(request);
  return _.map(sheet, function (row) {
    return _.map(row, function (column) {
      return resolveTree(column).then(function (columns) {
        return columns;
      });
    });
  });
}

module.exports = processRequest;


function debugSheet (sheet) {
  sheet = processRequest(sheet);

  var rows = _.map(sheet, function (row) {
    return Promise.all(row);
  });

  Promise.all(rows).then(function (sheet) {
    console.log(JSON.stringify(sheet));
  });
}

debugSheet([
  ['(`geo.country_code:US` as sum:bytes);(`*`).sum(A1@1)'],
]);

