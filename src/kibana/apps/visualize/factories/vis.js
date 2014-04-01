define(function (require) {
  var converters = require('../resp_converters/index');
  var _ = require('lodash');

  require('../services/aggs');

  function VisFactory(Aggs, $rootScope, $q, createNotifier) {
    var notify = createNotifier({
      location: 'Visualization'
    });

    function Vis(opts) {
      opts = opts || {};
      var config = opts.config || {};
      var state = opts.state || null;

      // the visualization type
      this.type = config.type || 'histogram';

      // the dataSource that will populate the
      this.dataSource = $rootScope.rootDataSource.extend().size(0);

      // setup each config category
      Vis.configCategoriesInFetchOrder.forEach(function (category) {
        var myCat = _.defaults(config[category.name] || {}, category.defaults);
        myCat.configs = [];
        this[category.name] = myCat;
      }, this);

      if (state) {
        // restore the passed in state
        this.setState(state);
      } else {
        this._fillConfigsToMinimum();
      }
    }

    Vis.configCategories = [
      {
        name: 'segment',
        displayOrder: 2,
        fetchOrder: 1,
        defaults: {
          min: 0,
          max: Infinity
        },
        configDefaults: {
          size: 5
        }
      },
      {
        name: 'metric',
        displayOrder: 1,
        fetchOrder: 2,
        defaults: {
          min: 0,
          max: 1
        },
        configDefaults: {
          agg: 'count'
        }
      },
      {
        name: 'group',
        displayOrder: 3,
        fetchOrder: 3,
        defaults: {
          min: 0,
          max: 1
        },
        configDefaults: {
          global: true,
          size: 5
        }
      },
      {
        name: 'split',
        displayOrder: 4,
        fetchOrder: 4,
        defaults: {
          min: 0,
          max: 2
        },
        configDefaults: {
          size: 5,
          row: true
        }
      }
    ];
    Vis.configCategoriesInFetchOrder = _.sortBy(Vis.configCategories, 'fetchOrder');
    Vis.configCategoriesInDisplayOrder = _.sortBy(Vis.configCategories, 'displayOrder');
    Vis.configCategoriesByName = _.indexBy(Vis.configCategories, 'name');

    Vis.prototype.addConfig = function (categoryName) {
      var category = Vis.configCategoriesByName[categoryName];
      var config = _.defaults({}, category.configDefaults);
      config.categoryName = category.name;

      this[category.name].configs.push(config);

      return config;
    };

    Vis.prototype.removeConfig = function (config) {
      if (!config) return;

      _.pull(this[config.categoryName].configs, config);
    };

    Vis.prototype.configCounts = {};

    Vis.prototype.setState = function (state) {
      var vis = this;

      vis.dataSource.getFields(function (fields) {
        _.each(state, function (categoryStates, configCategoryName) {
          if (!vis[configCategoryName]) return;

          vis[configCategoryName].configs.splice(0);

          categoryStates.forEach(function (configState) {
            var config = vis.addConfig(configCategoryName);
            _.assign(config, configState);
          });
        });

        vis._fillConfigsToMinimum();
      });
    };

    Vis.prototype._fillConfigsToMinimum = function () {
      var vis = this;

      // satify the min count for each category
      Vis.configCategoriesInFetchOrder.forEach(function (category) {
        var myCat = vis[category.name];
        if (myCat.configs.length < myCat.min) {
          _.times(myCat.min - myCat.configs.length, function () {
            vis.addConfig(category.name);
          });
        }
      });
    };

    /**
     * Create a list of config objects, which are ready to be turned into aggregations,
     * in the order which they should be executed.
     *
     * @return {Array} - The list of config objects
     */
    Vis.prototype.getConfig = function () {
      var vis = this;
      var positions = {
        split: [],
        global: [],
        segment: [],
        local: [],
        metric: []
      };

      function moveValidatedParam(config, params, paramDef, name) {
        if (!config[name]) return false;
        if (!paramDef.custom && paramDef.options && !_.find(paramDef.options, { val: config[name] })) return false;

        // copy over the param
        params[name] = config[name];

        // provide a hook to covert string values into more complex structures
        if (paramDef.toJSON) {
          params[name] = paramDef.toJSON(params[name]);
        }

        return true;
      }

      function readAndValidate(config) {
        // filter out plain unusable configs
        if (!config || !config.agg || !config.field) return;

        // get the agg used by this config
        var agg = Aggs.aggsByName[config.agg];
        if (!agg || agg.name === 'count') return;

        // copy parts of the config to the "validated" config object
        var validated = _.pick(config, 'categoryName', 'agg');
        validated.aggParams = {
          field: config.field
        };

        // copy over the row if this is a split
        if (config.categoryName === 'split') {
          validated.row = !!config.row;
        }

        // this function will move valus from config.* to validated.aggParams.* when they are
        // needed for that aggregation, and return true or false based on if all requirements
        // are meet
        var moveToAggParams = _.partial(moveValidatedParam, config, validated.aggParams);

        // ensure that all of the declared params for the agg are declared on the config
        if (_.every(agg.params, moveToAggParams)) return validated;
      }

      // collect all of the configs from each category,
      // validate them, filter the invalid ones, and put them into positions
      Vis.configCategoriesInFetchOrder.forEach(function (category) {
        var configs = vis[category.name].configs;

        configs = configs
          .map(readAndValidate)
          .filter(Boolean);

        if (category.name === 'group') {
          positions.global = _.where(configs, { global: true });
          positions.local = _.where(configs, { global: false });
        } else {
          positions[category.name] = configs;
        }
      });

      return positions.split.concat(positions.global, positions.segment, positions.local, positions.metric);
    };

    /**
     * Transform an ES Response into data for this visualization
     * @param  {object} resp The elasticsearch response
     * @return {array} An array of flattened response rows
     */
    Vis.prototype.buildChartDataFromResponse = function (resp) {
      notify.event('convert ES response');

      // all aggregations will be prefixed with:
      var aggKeyPrefix = '_agg_';

      // this will transform our flattened rows and columns into the
      // data structure expected for a visualization
      var converter = converters[this.type];

      // the list of configs that make up the aggs and eventually
      // splits and columns, label added
      var configs = this.getConfig().map(function (col) {
        var agg = Aggs.aggsByName[col.agg];
        if (!agg) {
          col.label = col.agg;
        } else if (agg.makeLabel) {
          col.label = Aggs.aggsByName[col.agg].makeLabel(col.aggParams);
        } else {
          col.label = agg.display || agg.name;
        }
        return col;
      });

      var lastCol = configs[configs.length - 1];

      // column stack, when we are deap within recursion this
      // will hold the previous columns
      var colStack = [];

      // row stack, similar to the colStack but tracks unfinished rows
      var rowStack = [];

      // all chart data will be written here or to child chartData
      // formatted objects
      var chartData = {};

      var writeRow = function (rows, bucket) {
        // collect the count and bail, free metric!!
        rows.push(rowStack.concat(bucket.value === void 0 ? bucket.doc_count : bucket.value));
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

        // add it to the top of the stack
        colStack.unshift(col);

        // the actual results for the aggregation is under an _agg_* key
        var result = bucket[getAggKey(bucket)];

        switch (col.categoryName) {
        case 'split':
          // pick the key for the split's groups
          var groupsKey = col.row ? 'rows' : 'columns';

          // the groups will be written here
          chartData[groupsKey] = [];

          result.buckets.forEach(function (bucket) {
            // create a new group for each bucket
            var group = {
              label: col.label
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
                agg: Aggs.aggsByName.count.name,
                label: Aggs.aggsByName.count.display
              });
            }
          }

          if (col.categoryName === 'metric') {
            // there are no buckets, just values to collect.
            // Write the the row to the chartData
            writeRow(chartData.rows, result);
          } else {
            // non-metric aggs create buckets that we need to add
            // to the rows
            result.buckets.forEach(function (bucket) {
              rowStack.push(bucket.key);

              if (col === lastCol) {
                // since this is the last column, there is no metric (otherwise it
                // would be last) so write the row into the chart data
                writeRow(chartData.rows, bucket);
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
      }

      // flattening the chart does not always result in a split,
      // so we need to check for a chart before we return
      if (chartData.rows && chartData.columns) writeChart(chartData);

      notify.event('convert ES response', true);
      return chartData;
    };

    return Vis;
  }

  require('modules')
    .get('kibana/services')
    .factory('Vis', VisFactory);
});