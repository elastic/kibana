define(function (require) {
  return function BuildChartDataFn(Notifier, Private, courier) {
    var _ = require('lodash');
    var aggs = Private(require('./_aggs'));
    var converters = Private(require('./resp_converters/index'));

    var notify = new Notifier();

    return function (indexPattern, resp) {
      notify.event('convert ES response');

      var fieldsByName = indexPattern.fieldsByName;

      // all aggregations will be prefixed with:
      var aggKeyPrefix = '_agg_';
      var vis = this;

      // this will transform our flattened rows and columns into the
      // data structure expected for a visualization
      var converter = converters[vis.typeName];

      // the list of configs that make up the aggs and eventually
      // splits and columns, label added
      var configs = vis.getConfig().map(function (config) {
        config.field = fieldsByName[config.aggParams.field];
        return config;
      });

      // when we are recursing put previous configs here
      var configStack = [];

      // when we are recursing put previous columns here
      var colStack = [];

      // row stack, similar to the colStack but tracks unfinished rows
      var rowStack = [];

      // all chart data will be written here or to child chartData
      // formatted objects
      var chartData = {};

      var finishRow = function (rows, col, bucket) {
        rows.push(rowStack.concat(bucket.value == null ? bucket.doc_count : bucket.value));
      };

      var getAggKey = function (bucket) {
        return Object.keys(bucket)
          .filter(function (key) {
            return key.substr(0, aggKeyPrefix.length) === aggKeyPrefix;
          })
          .pop();
      };

      var splitAndFlatten = function (chartData, bucket) {
        // pull the next column from the configs list
        var col = configs.shift();

        if (!col) {
          // fake the config
          col = {
            fake: true,
            categoryName: 'metric',
            agg: aggs.byName.count.name,
            label: aggs.byName.count.display
          };
        }

        // add it to the top of the stack
        configStack.unshift(col);

        // the actual results for the aggregation is under an _agg_* key
        var result = col.fake ? bucket : bucket[getAggKey(bucket)];

        switch (col.categoryName) {
        case 'split':
          // pick the key for the split's groups
          var groupsKey = col.row ? 'rows' : 'columns';
          var groupList = chartData[groupsKey] || (chartData[groupsKey] = []);
          var groupMap = chartData.splits || (chartData.splits = {});

          result.buckets.forEach(function (bucket) {
            var label = col.aggParams.field + ': ' + bucket.key;
            var group = groupMap[label];

            if (!group) {
              group = {
                label: label
              };
              groupList.push(group);
              groupMap[label] = group;
            }

            splitAndFlatten(group, bucket);
          });
          break;
        case 'group':
        case 'segment':
          // non-metric aggs create buckets that we need to add
          // to the rows
          colStack.push(col);
          result.buckets.forEach(function (bucket) {
            rowStack.push(bucket.key);

            // into the rabbit hole
            splitAndFlatten(chartData, bucket);

            rowStack.pop();
          });
          colStack.pop();
          break;
        case 'metric':
          // this column represents actual chart data
          if (!chartData.columns || !chartData.rows) {
            // copy the current column and remaining columns into the column list
            chartData.columns = colStack.concat(col);

            // write rows here
            chartData.rows = [];
          }

          // there are no buckets, just values to collect.
          // Write the the row to the chartData
          finishRow(chartData.rows, col, result);
          break;
        }

        configs.unshift(configStack.shift());
      };

      if (resp.aggregations) {
        splitAndFlatten(chartData, resp.aggregations);
      } else {
        chartData.rows = [];
        chartData.columns = [
          {
            categoryName: 'metric',
            agg: aggs.byName.count.name,
            label: aggs.byName.count.display
          }
        ];
        finishRow(chartData.rows, null, { doc_count: resp.hits.total });
      }

      // now that things are well-ordered, and
      // all related values have been segregated into
      // their individual charts, we can go through and
      // cleanup the leftover metadata and label each chart
      var labelStack = [];
      (function cleanup(obj) {
        if (obj.rows && obj.columns) {
          // this obj is a chart
          var rows = obj.rows;
          var cols = obj.columns;
          delete obj.rows;
          delete obj.columns;
          obj.label = [].concat(labelStack, obj.label).filter(Boolean).join(' > ');

          converter(obj, cols, rows);
        } else if (obj.splits) {
          var splits = obj.splits;
          delete obj.splits;
          labelStack.push(obj.label);
          _.forOwn(splits, cleanup);
          labelStack.pop();
        }
      }(chartData));


      notify.event('convert ES response', true);
      return chartData;
    };
  };
});