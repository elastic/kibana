define(function (require) {
  return function ReadConfigFn(Private) {
    var _ = require('lodash');
    var configCategories = require('./_config_categories');
    var Number = Private(require('field_types/field_types')).number;
    var aggs = require('./_aggs');
    var courier = require('courier/courier');

    return function readConfig() {
      var vis = this;

      // these arrays represent the different sections used to create an aggregation, and when config objects are encountered
      // the are pushed into these array's based on their properties. Array's are used to make the logic and the final
      // combination simple. Many of these will be limited to a single value by the UI
      var positions = {
        // used to create rows/columns
        split: [],
        // global segments (eg. color, marked in the ui to be applied gloabally and the same values should be used across all charts)
        global: [],
        // primary segments (eg. x-axis)
        segment: [],
        // local segments (eg. color, marked in the ui that it should apply within each chart)
        local: [],
        // metric is the root "measurement" (eg. y-axis)
        metric: []
      };

      function moveValidatedParam(config, params, paramDef, name) {
        if (!config[name]) {
          if (paramDef.default != null) config[name] = _.cloneDeep(paramDef.default);
          else return !paramDef.required;
        }
        if (!paramDef.custom && paramDef.options && !_.find(paramDef.options, { val: config[name] })) return false;

        // copy over the param
        params[name] = config[name];

        // provide a hook to covert string values into more complex structures
        if (paramDef.toJSON) {
          params[name] = paramDef.toJSON(params[name]);
        }

        return true;
      }

      function makeCategoryValidator(category) {
        return function categoryValidator(config) {
          // filter out plain unusable configs
          if (!config || !config.agg || !config.field) return;

          // get the agg used by this config
          var agg = aggs.byName[config.agg];
          if (!agg || agg.name === 'count') return;

          // copy parts of the config to the "validated" config object
          var validated = {
            agg: config.agg,
            aggParams: {
              field: config.field
            },
            categoryName: category.name
          };

          // copy over other properties based on the category
          switch (category.name) {
          case 'split':
            validated.row = !!config.row;
            break;
          case 'group':
            validated.global = !!config.global;
            break;
          }

          // this function will move valus from config.* to validated.aggParams.* when they are
          // needed for that aggregation, and return true or false based on if all requirements
          // are meet
          var moveToAggParams = _.partial(moveValidatedParam, config, validated.aggParams);

          // ensure that all of the declared params for the agg are declared on the config
          if (_.every(agg.params, moveToAggParams)) return validated;
        };
      }

      // collect all of the configs from each category,
      // validate them, filter the invalid ones, and put them into positions
      configCategories.fetchOrder.forEach(function (category) {
        var configs = vis[category.name].configs;

        configs = configs
          .map(makeCategoryValidator(category))
          .filter(Boolean);

        if (category.name === 'group') {
          positions.global = _.where(configs, { global: true });
          positions.local = _.where(configs, { global: false });
        } else {
          positions[category.name] = configs;
        }
      });

      // join all of the different positions into a single array
      return positions.split.concat(positions.global, positions.segment, positions.local, positions.metric);
    };
  };
});