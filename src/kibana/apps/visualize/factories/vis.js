define(function (require) {
  var converters = require('../resp_converters/index');
  var _ = require('lodash');

  require('../services/aggs');

  function VisFactory(Aggs, $rootScope, $q, createNotifier) {
    var notify = createNotifier({
      location: 'Visualization'
    });

    function Vis(config, state) {
      config = config || {};

      // the visualization type
      this.type = config.type || 'histogram';

      // the dataSource that will populate the
      this.dataSource = $rootScope.rootDataSource.extend().size(0);

      // master list of configs, addConfig() writes here and to the list within each
      // config category, removeConfig() does the inverse
      this.configs = [];

      // setup each config category
      Vis.configCategories.forEach(function (category) {
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
        defaults: {
          min: 0,
          max: 2
        },
        configDefaults: {
          size: 5
        }
      }
    ];
    Vis.configCategoriesByName = _.indexBy(Vis.configCategories, 'name');

    Vis.prototype.addConfig = function (categoryName) {
      var category = Vis.configCategoriesByName[categoryName];
      var config = _.defaults({}, category.configDefaults);
      config.categoryName = category.name;

      this.configs.push(config);
      this[category.name].configs.push(config);

      return config;
    };

    Vis.prototype.removeConfig = function (config) {
      if (!config) return;

      _.pull(this.configs, config);
      _.pull(this[config.categoryName].configs, config);
    };

    Vis.prototype.setState = function (state) {
      var vis = this;

      vis.dataSource.getFields(function (fields) {
        vis.configs = [];

        _.each(state, function (categoryStates, configCategoryName) {
          if (!vis[configCategoryName]) return;

          vis[configCategoryName].configs = [];

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
      Vis.configCategories.forEach(function (category) {
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
      var cats = {
        split: [],
        global: [],
        segment: [],
        local: [],
        metric: []
      };

      this.configs.forEach(function (config) {
        var pos = config.categoryName;
        if (pos === 'group') pos = config.global ? 'global' : 'local';

        if (!config.field || !config.agg) return;

        var agg = Aggs.aggsByName[config.agg];
        if (!agg || agg.name === 'count') return;

        var params = {
          categoryName: config.categoryName,
          agg: config.agg,
          aggParams: {
            field: config.field
          }
        };

        // ensure that all of the declared params for the agg are declared on the config
        var valid = _.every(agg.params, function (paramDef, name) {
          if (!config[name]) return;
          if (!paramDef.custom && paramDef.options && !_.find(paramDef.options, { val: config[name] })) return;

          // copy over the param
          params.aggParams[name] = config[name];

          // allow provide a hook to covert string values into more complex structures
          if (paramDef.toJSON) {
            params.aggParams[name] = paramDef.toJSON(params.aggParams[name]);
          }

          return true;
        });

        if (valid) cats[pos].push(params);
      });

      return cats.split.concat(cats.global, cats.segment, cats.local, cats.metric);
    };

    /**
     * Transform an ES Response into data for this visualization
     * @param  {object} resp The elasticsearch response
     * @return {array} An array of flattened response rows
     */
    Vis.prototype.buildChartDataFromResponse = function (resp) {
      notify.event('convert ES response');

      function createGroup(bucket) {
        var g = {};
        if (bucket) g.key = bucket.key;
        return g;
      }

      function finishRow(bucket) {
        // collect the count and bail, free metric!!
        level.rows.push(row.concat(bucket.value === void 0 ? bucket.doc_count : bucket.value));
      }

      // all aggregations will be prefixed with:
      var aggKeyPrefix = '_agg_';
      var converter = converters[this.type];

      // as we move into the different aggs, shift configs
      var childConfigs = this.getConfig();
      var lastCol = childConfigs[childConfigs.length - 1];

      // into stack, and then back when we leave a level
      var stack = [];
      var row = [];

      var chartData = createGroup();
      var level = chartData;

      (function splitAndFlatten(bucket) {
        var col = childConfigs.shift();
        // add it to the top of the stack
        stack.unshift(col);

        _.forOwn(bucket, function (result, key) {
          // filter out the non prefixed keys
          if (key.substr(0, aggKeyPrefix.length) !== aggKeyPrefix) return;

          if (col.categoryName === 'split') {
            var parent = level;
            result.buckets.forEach(function (bucket) {
              var group = createGroup(bucket);

              if (parent.groups) parent.groups.push(group);
              else parent.groups = [group];

              level = group;
              splitAndFlatten(bucket);
              if (group.rows && group.columns) {
                group.data = converter(group.columns, group.rows);
                delete group.rows;
                delete group.columns;
              }
            });

            level = parent;
            return;
          }

          if (!level.columns || !level.rows) {
            // setup this level to receive records
            level.columns = [stack[0]].concat(childConfigs);
            level.rows = [];

            // the columns might now end in a metric, but the rows will
            if (childConfigs[childConfigs.length - 1].categoryName !== 'metric') {
              level.columns.push({
                categoryName: 'metric',
                agg: 'count'
              });
            }
          }

          if (col.categoryName === 'metric') {
            // one row per bucket
            finishRow(result);
          } else {
            // keep digging
            result.buckets.forEach(function (bucket) {
              // track this bucket's "value" in our temporary row
              row.push(bucket.key);

              if (col === lastCol) {
                // also grab the bucket's count
                finishRow(bucket);
              } else {
                splitAndFlatten(bucket);
              }

              row.pop();
            });
          }
        });

        childConfigs.unshift(stack.shift());
      })(resp.aggregations);

      notify.event('convert ES response', true);


      return chartData;
    };

    return Vis;
  }

  require('modules')
    .get('kibana/services')
    .factory('Vis', VisFactory);
});