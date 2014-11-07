define(function (require) {
  return function BuildChartDataFn(Notifier, Private) {
    var _ = require('lodash');
    var AggConfig = Private(require('components/vis/_agg_config'));
    var countAgg = Private(require('components/agg_types/index')).byName.count;

    var notify = new Notifier();

    return function (vis, resp) {
      var complete = notify.event('convert ES response');

      // this will transform our flattened rows and columns into the
      // data structure expected for a visualization
      var converter = vis.type.responseConverter;

      // the list of "configs" that we will use to read the response
      var configs = vis.aggs.getSorted().map(function (aggConfig) {
        var chartDataConfig = _.assign(
          {
            categoryName: aggConfig.schema.name,
            id: aggConfig.id,
            aggConfig: aggConfig,
            aggType: aggConfig.type,
            field: aggConfig.params.field,
            label: aggConfig.type.makeLabel(aggConfig),
          },
          _.merge(
            aggConfig.schema.params.write(aggConfig),
            aggConfig.write()
          )
        );
        return chartDataConfig;
      });

      var lastConfig = configs[configs.length - 1];
      if (!lastConfig || lastConfig.categoryName !== 'metric') {
        // fake the config
        configs.push({
          fake: true,
          categoryName: 'metric',
          aggType: countAgg,
          label: countAgg.title
        });
      }

      // only non-split columns apply to charts, so create a list that can be used for each chart
      var chartColumns = configs.filter(function (agg) {
        return agg.categoryName !== 'split';
      });

      // a reverse stack of the aggs, so we can pop and push
      var colStack = configs.slice(0).reverse();

      // row stack, similar to the colStack but tracks unfinished rows
      var rowStack = [];

      // all chart data will be written here or to child chartData
      // formatted objects
      var chartData = {};

      var writeRow = function (chartData, bucket) {
        if (!chartData.rows || !chartData.columns) {
          // write rows here
          chartData.rows = [];
          chartData.columns = chartColumns;
        }

        if (!bucket) return;

        var row = new Array(chartColumns.length);
        rowStack.forEach(function (val, i) {
          row[i] = val;
        });

        var metric = bucket.value == null ? bucket.doc_count : bucket.value;
        if (metric != null) {
          row[row.length - 1] = metric;
        } else {
          return; // ignore this row that doesn't have a metric
        }

        chartData.rows.push(row);
      };

      var splitAndFlatten = function (chartData, bucket) {
        // pull the next column from the aggs list
        var col = colStack.pop();

        // the actual results for the aggregation is under an _agg_* key
        var result = (col.aggConfig && bucket[col.aggConfig.id]) || bucket;

        if (result && _.isPlainObject(result.buckets)) {
          result.buckets = _.map(result.buckets, function (v, k) {
            v.key = k;
            return v;
          });
        }

        switch (col.categoryName) {
        case 'split':
          // pick the key for the split's groups
          var groupsKey = col.params.row ? 'rows' : 'columns';
          var groupList = chartData[groupsKey] || (chartData[groupsKey] = []);
          var groupMap = chartData.splits || (chartData.splits = {});

          result.buckets.forEach(function (bucket) {
            var bucketId = bucket.key + (col.field ? ': ' + col.field.name : '');
            var group = groupMap[bucketId];

            if (!group) {
              group = {
                column: col,
                value: bucket.key,
                label: bucketId
              };
              groupList.push(group);
              groupMap[bucketId] = group;
            }

            splitAndFlatten(group, bucket);
          });
          break;
        case 'metric':
          // there are no buckets, just values to collect.
          // Write the the row to the chartData
          writeRow(chartData, result);
          break;
        default:
          // non-metric aggs create buckets that we need to add
          // to the rows
          if (result && result.buckets.length) {
            result.buckets.forEach(function (bucket) {
              rowStack.push(bucket.key);

              // into the rabbit hole
              splitAndFlatten(chartData, bucket);

              rowStack.pop();
            });
          } else {
            writeRow(chartData);
          }
          break;
        }

        colStack.push(col);
      };

      if (resp.aggregations) {
        splitAndFlatten(chartData, resp.aggregations);
      } else if (colStack.length === 1 && colStack[0].aggConfig.type.name === 'count') {
        writeRow(chartData, { doc_count: resp.hits.total });
      }

      // ensure chart container is always created
      if (!chartData.rows && !chartData.splits) {
        writeRow(chartData);
      }

      // add labels to each config before they are processed
      configs.forEach(function (config) {
        if (config.label) return;

        if (config.aggType && config.aggType.makeLabel) {
          config.label = config.aggType.makeLabel(config.aggConfig);
          return;
        }

        if (config.field) {
          config.label = config.field.name;
          return;
        }
      });

      // now that things are well-ordered, and
      // all related values have been segregated into
      // their individual charts, we can go through and
      // cleanup the leftover metadata and label each chart
      var labelStack = [];

      // we will also collect a raw view of the data, which may be displayed in a table view by the visualization
      var raw = {
        // track the columns from splits, write when we hit the first chart
        splitColumns: [],
        splitValStack: [],
        // written the first time a chart is encoutered, merges the splitColumns and the chart's columns
        columns: null,
        rows: []
      };

      (function cleanup(obj) {
        if (obj.rows && obj.columns) {
          // this obj is a chart

          if (!raw.columns) {
            raw.columns = raw.splitColumns.concat(obj.columns);
          }

          var rows = obj.rows;
          var cols = obj.columns;

          delete obj.rows;
          delete obj.columns;

          obj.label = [].concat(labelStack, obj.label).filter(Boolean).join(' > ');
          rows.forEach(function (row) {
            raw.rows.push([].concat(raw.splitValStack, row));
          });

          converter(obj, cols, rows);
        } else if (obj.splits) {
          var splits = obj.splits;
          delete obj.splits;

          labelStack.push(obj.label);

          _.forOwn(splits, function (split) {
            raw.splitColumns.push(split.column);
            raw.splitValStack.push(split.value);
            delete split.column;
            delete split.value;

            cleanup(split);

            raw.splitColumns.pop();
            raw.splitValStack.pop();
          });

          labelStack.pop();
        }
      }(chartData));

      chartData.raw = raw;
      chartData.hits = resp.hits.total;
      complete();
      return chartData;
    };
  };
});
