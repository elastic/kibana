define(function (require) {
  return function BuildChartDataFn(Notifier, Private, courier) {
    var _ = require('lodash');
    var aggs = Private(require('apps/visualize/saved_visualizations/_aggs'));
    var converters = Private(require('apps/visualize/saved_visualizations/resp_converters/index'));

    var notify = new Notifier();

    return function (indexPattern, resp) {
      var complete = notify.event('convert ES response');

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
      if (!lastCol || lastCol.categoryName !== 'metric') {
        // fake the config
        configs.push({
          fake: true,
          categoryName: 'metric',
          agg: aggs.byName.count.name,
          label: aggs.byName.count.display
        });
      }

      // a reverse stack of the configs, so we can pop and push
      var revColStack = configs.slice(0);
      revColStack.reverse();

      // only non-split columns apply to charts, so create a list that can be used for each chart
      var chartColumns = configs.filter(function (col) {
        return col.categoryName !== 'split';
      });

      // when we are recursing put previous columns here
      var colStack = [];

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

        var row = rowStack.slice(0);
        var metric = bucket.value == null ? bucket.doc_count : bucket.value;

        if (!revColStack.length) {
          // we have a full row, minus the final metric
          row.push(metric);
        } else {
          // we ended suddenly, so add undefined values for the columns we have not see yet
          [].push.apply(row, new Array(revColStack.length + 1));
        }

        chartData.rows.push(row);
      };

      var getAggKey = function (bucket) {
        return bucket.__aggKey__ || (bucket.__aggKey__ = Object.keys(bucket)
          .filter(function (key) {
            return key.substr(0, aggKeyPrefix.length) === aggKeyPrefix;
          })
          .pop());
      };

      var splitAndFlatten = function (chartData, bucket) {
        // pull the next column from the configs list
        var col = revColStack.pop();

        // the actual results for the aggregation is under an _agg_* key
        var result = col.fake ? bucket : bucket[getAggKey(bucket)];

        if (result && _.isPlainObject(result.buckets)) {
          result.buckets = _.map(result.buckets, function (v, k) {
            v.key = k;
            return v;
          });
        }

        switch (col.categoryName) {
        case 'split':
          // pick the key for the split's groups
          var groupsKey = col.row ? 'rows' : 'columns';
          var groupList = chartData[groupsKey] || (chartData[groupsKey] = []);
          var groupMap = chartData.splits || (chartData.splits = {});

          result.buckets.forEach(function (bucket) {
            var label = col.aggParams.field + ': ' + bucket.key;
            var id = col.aggParams.field + bucket.key;
            var group = groupMap[id];

            if (!group) {
              group = {
                column: col,
                value: bucket.key,
                label: label
              };
              groupList.push(group);
              groupMap[id] = group;
            }

            splitAndFlatten(group, bucket);
          });
          break;
        case 'group':
        case 'segment':
          colStack.push(col);
          // non-metric aggs create buckets that we need to add
          // to the rows
          if (result.buckets.length) {
            result.buckets.forEach(function (bucket) {
              rowStack.push(bucket.key);

              // into the rabbit hole
              splitAndFlatten(chartData, bucket);

              rowStack.pop();
            });
          } else {
            writeRow(chartData, bucket);
          }
          colStack.pop();
          break;
        case 'metric':
          colStack.push(col);
          // there are no buckets, just values to collect.
          // Write the the row to the chartData
          writeRow(chartData, result);
          colStack.pop();
          break;
        }

        revColStack.push(col);
      };

      // add labels to each config before they are processed
      configs.forEach(function (config) {
        var agg = aggs.byName[config.agg];
        if (agg && agg.makeLabel) {
          config.label = agg.makeLabel(config.aggParams, config);
        } else {
          config.label = config.aggParams.field;
        }
      });

      if (!resp.aggregations) {
        // fake the aggregation response since this requests didn't actually have aggs
        resp.aggregations = {
          doc_count: resp.hits.total
        };
      }

      splitAndFlatten(chartData, resp.aggregations);

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
      complete();
      return chartData;
    };
  };
});