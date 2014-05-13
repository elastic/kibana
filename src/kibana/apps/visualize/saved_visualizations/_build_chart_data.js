define(function (require) {
  return function BuildChartDataFn(Notifier, Private, courier) {
    var _ = require('lodash');
    var aggs = require('./_aggs');
    var converters = require('./resp_converters/index');

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

      var lastCol = configs[configs.length - 1];

      // column stack, when we are deap within recursion this
      // will hold the previous columns
      var colStack = [];

      // row stack, similar to the colStack but tracks unfinished rows
      var rowStack = [];

      // all chart data will be written here or to child chartData
      // formatted objects
      var chartData = {
        label: _.reduce(configs, function (label, col) {
          var agg = aggs.byName[col.agg];

          if (!agg) {
            col.label = col.agg;
          } else if (agg.makeLabel) {
            col.label = aggs.byName[col.agg].makeLabel(col.aggParams);
          } else {
            col.label = agg.display || agg.name;
          }

          if (label) {
            return label + ' > ' + col.label;
          } else {
            return col.label;
          }
        }, '')
      };

      var finishRow = function (rows, col, bucket) {
        rows.push(rowStack.concat(bucket.value == null ? bucket.doc_count : bucket.value));
      };

      var writeChart = function (chart) {
        var rows = chart.rows;
        var cols = chart.columns;
        delete chart.rows;
        delete chart.columns;

        converter(chart, cols, rows);
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

        if (!col) throw new Error('Missing config in render');

        // add it to the top of the stack
        colStack.unshift(col);

        // the actual results for the aggregation is under an _agg_* key
        var result = bucket[getAggKey(bucket)];

        switch (col.categoryName) {
        case 'split':
          // pick the key for the split's groups
          var groupsKey = col.row ? 'rows' : 'columns';

          // if (chartData.label) {
          //   chartData.label = col.label + ' > ' + chartData.label;
          // } else {
          //   chartData.label = col.label;
          // }

          // the groups will be written here
          chartData[groupsKey] = [];

          result.buckets.forEach(function (bucket) {
            // create a new group for each bucket
            var group = {
              label: bucket.key
            };
            chartData[groupsKey].push(group);

            // down the rabbit hole
            splitAndFlatten(group, bucket);

            // flattening this bucket caused a chart to be created
            // convert the rows and columns into a legit chart
            if (group.rows && group.columns) writeChart(group);
          });
          break;
        case 'group':
        case 'segment':
        case 'metric':
          // this column represents actual chart data
          if (!chartData.columns || !chartData.rows) {
            // copy the current column and remaining columns into the column list
            chartData.columns = [col].concat(configs);

            // write rows here
            chartData.rows = [];

            // if the columns don't end in a metric then we will be
            // pulling the count of the final bucket as the metric.
            // Ensure that there is a column for this data
            if (chartData.columns[chartData.columns.length - 1].categoryName !== 'metric') {
              chartData.columns.push({
                categoryName: 'metric',
                agg: aggs.byName.count.name,
                label: aggs.byName.count.display
              });
            }
          }

          if (col.categoryName === 'metric') {
            // there are no buckets, just values to collect.
            // Write the the row to the chartData
            finishRow(chartData.rows, col, result);
          } else {
            // non-metric aggs create buckets that we need to add
            // to the rows
            result.buckets.forEach(function (bucket) {
              rowStack.push(bucket.key);

              if (col === lastCol) {
                // since this is the last column, there is no metric (otherwise it
                // would be last) so write the row into the chart data
                finishRow(chartData.rows, col, bucket);
              } else {
                // into the rabbit hole
                splitAndFlatten(chartData, bucket);
              }

              rowStack.pop();
            });
          }
          break;
        }

        configs.unshift(colStack.shift());
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

      // flattening the chart does not always result in a split,
      // so we need to check for a chart before we return
      if (chartData.rows && chartData.columns) writeChart(chartData);

      notify.event('convert ES response', true);
      return chartData;
    };
  };
});