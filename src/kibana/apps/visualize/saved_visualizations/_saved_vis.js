define(function (require) {
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  var configCats = require('./_config_categories');
  var aggs = require('./_aggs');
  var typeDefs = require('./_type_defs');

  require('services/root_search');

  var module = require('modules').get('kibana/services');

  module.factory('SavedVis', function (config, $injector, SavedObject, rootSearch, Promise, savedSearches) {
    function SavedVis(type, id) {
      var typeDef = typeDefs.byName[type];
      if (!typeDef) throw new Error('Unknown visualization type: "' + type + '"');

      SavedObject.call(this, {
        type: 'visualization',

        id: id,

        mapping: {
          stateJSON: 'string',
          savedSearchId: 'string',
          typeName: 'string',
        },

        defaults: {
          stateJSON: '{}',
          typeName: type,
        },

        searchSource: true,

        afterESResp: function setVisState() {
          var vis = this;
          var state = {};

          if (vis.stateJSON) try { state = JSON.parse(vis.stateJSON); } catch (e) {}

          var parent = rootSearch;
          if (vis.savedSearchId) {
            if (!vis.savedSearch || vis.savedSearch.id !== vis.savedSearchId) {
              // returns a promise
              parent = savedSearches.get(vis.savedSearchId);
            }
          }

          configCats.forEach(function (category) {
            var configStates = state[category.name];
            if (_.isArray(configStates)) {
              configStates.forEach(function (configState) {
                var config = vis.addConfig(category.name);
                _.assign(config, configState);
              });
            }
          });

          // can be either a SavedSearch or a savedSearches.get() promise
          return Promise.cast(parent)
          .then(function (parent) {
            vis.savedSearch = parent;

            vis.searchSource
              .inherits(vis.savedSearch)
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

      this.addConfig = function (categoryName) {
        var category = configCats.byName[categoryName];
        var config = _.defaults({}, category.configDefaults);
        config.categoryName = category.name;

        this[category.name].configs.push(config);

        return config;
      };

      this.removeConfig = function (config) {
        if (!config) return;
        _.pull(this[config.categoryName].configs, config);
      };

      this._fillConfigsToMinimum = function () {
        var vis = this;

        // satify the min count for each category
        configCats.fetchOrder.forEach(function (category) {
          var myCat = vis[category.name];

          if (!myCat) {

            myCat = _.defaults(typeDef.config[category.name] || {}, category.defaults);
            myCat.configs = [];
            vis[category.name] = myCat;
          }

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
      this.getConfig = require('./_read_config');
      /**
       * Transform an ES Response into data for this visualization
       * @param  {object} resp The elasticsearch response
       * @return {array} An array of flattened response rows
       */
      this.buildChartDataFromResponse = $injector.invoke(require('./_build_chart_data'));
    }
    inherits(SavedVis, SavedObject);

    return SavedVis;
  });
});