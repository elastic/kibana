define(function (require) {
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  var configCats = require('./_config_categories');
  var aggs = require('./_aggs');
  var typeDefs = require('./_type_defs');

  require('services/root_search');

  var module = require('modules').get('kibana/services');

  module.factory('SavedVis', function (config, $injector, SavedObject, rootSearch, Promise, savedSearches) {
    function SavedVis(opts) {
      var vis = this;
      opts = opts || {};

      if (typeof opts !== 'object') {
        opts = {
          id: opts
        };
      }

      var typeDef = typeDefs.byName[opts.type || 'histogram'];
      if (!typeDef) throw new Error('Unknown visualization type: "' + opts.type + '"');

      SavedObject.call(vis, {
        type: 'visualization',

        id: opts.id,

        mapping: {
          title: 'string',
          typeName: 'string',
          stateJSON: 'string',
          description: 'string',
          savedSearchId: 'string'
        },

        defaults: {
          title: '',
          typeName: opts.type,
          stateJSON: null,
          description: '',
          savedSearchId: opts.savedSearchId,
        },

        searchSource: true,

        afterESResp: function setVisState() {
          // get the saved state
          var state;
          if (vis.stateJSON) try { state = JSON.parse(vis.stateJSON); } catch (e) {}

          // set the state on the vis
          if (state) vis.setState(state);


          // default parent is the rootSearch, mimic the
          // searchSource prop from saved objects
          var parent = {
            searchSource: rootSearch
          };

          // set/get the parent savedSearch
          if (vis.savedSearchId) {
            if (!vis.savedSearch || vis.savedSearch.id !== vis.savedSearchId) {
              // returns a promise
              parent = savedSearches.get(vis.savedSearchId);
            }
          }

          // can be either a SavedSearch or a savedSearches.get() promise
          return Promise.cast(parent)
          .then(function (parent) {
            vis.savedSearch = parent;

            vis.searchSource
              .inherits(parent.searchSource)
              .size(0);

            vis._fillConfigsToMinimum();
            // get and cache the field list
            return vis.searchSource.getFields();
          })
          .then(function () {
            return vis;
          });
        }
      });

      if (opts.indexPattern) {
        vis.searchSource.index(opts.indexPattern);
      }

      // initialize config categories
      configCats.forEach(function (category) {
        var cat = _.defaults(typeDef.config[category.name] || {}, category.defaults);
        cat.configs = [];
        vis[category.name] = cat;
      });

      vis.addConfig = function (categoryName) {
        var category = configCats.byName[categoryName];
        var config = _.defaults({}, category.configDefaults);
        config.categoryName = category.name;

        vis[category.name].configs.push(config);

        return config;
      };

      vis.removeConfig = function (config) {
        if (!config) return;
        _.pull(vis[config.categoryName].configs, config);
      };

      vis._fillConfigsToMinimum = function () {

        // satify the min count for each category
        configCats.fetchOrder.forEach(function (category) {
          var myCat = vis[category.name];

          if (myCat.configs.length < myCat.min) {
            _.times(myCat.min - myCat.configs.length, function () {
              vis.addConfig(category.name);
            });
          }
        });
      };

      vis.setState = function (state, noWipe) {
        configCats.forEach(function (category) {
          var categoryStates = state[category.name] || [];
          noWipe || vis[category.name].configs.splice(0);
          categoryStates.forEach(function (configState) {
            var config = vis.addConfig(category.name);
            _.assign(config, configState);
          });
        });

        vis._fillConfigsToMinimum();
      };

      vis.getState = function () {
        return _.transform(configCats, function (state, category) {
          var configs = state[category.name] = [];

          [].push.apply(configs, vis[category.name].configs.map(function (config) {
            return _.pick(config, function (val, key) {
              return key.substring(0, 2) !== '$$';
            });
          }));
        }, {});
      };

      /**
       * Create a list of config objects, which are ready to be turned into aggregations,
       * in the order which they should be executed.
       *
       * @return {Array} - The list of config objects
       */
      vis.getConfig = require('./_read_config');
      /**
       * Transform an ES Response into data for this visualization
       * @param  {object} resp The elasticsearch response
       * @return {array} An array of flattened response rows
       */
      vis.buildChartDataFromResponse = $injector.invoke(require('./_build_chart_data'));
    }
    inherits(SavedVis, SavedObject);

    return SavedVis;
  });
});