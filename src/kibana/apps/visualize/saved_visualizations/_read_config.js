define(function (require) {
  return function ReadConfigFn(Private, $injector) {
    var _ = require('lodash');
    var configCategories = require('apps/visualize/saved_visualizations/_config_categories');
    var aggs = Private(require('apps/visualize/saved_visualizations/_aggs'));
    var courier = require('components/courier/courier');

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

      function moveValidatedParam(input, output, paramDef, name) {
        if (!input[name]) {
          if (paramDef.default != null) input[name] = _.cloneDeep(paramDef.default);
          else return !paramDef.required;
        }

        var val = input[name];
        var selectedOption = paramDef.options &&  _.find(paramDef.options, { val: val });
        if (!paramDef.custom && paramDef.options && !selectedOption) return false;

        if (paramDef.write) {
          var selection = selectedOption;
          // either the value is custom or there just aren't any options defined
          if (!selectedOption && val != null) selection = { val: val };

          // provide a hook to apply custom logic when writing this config value
          paramDef.write(selection, output);
        } else {
          // copy over the param
          output.aggParams[name] = val;
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

          // copy parts of the config to the validated "output" object
          var output = {
            agg: config.agg,
            aggParams: {},
            categoryName: category.name
          };

          if (agg.name !== 'filters') output.aggParams.field = config.field;

          // copy over other properties based on the category
          switch (category.name) {
          case 'split':
            output.row = !!config.row;
            break;
          case 'group':
            output.global = !!config.global;
            break;
          }

          // this function will move valus from config.* to output.aggParams.* when they are
          // needed for that aggregation, and return true or false based on if all requirements
          // are meet
          var moveToAggParams = _.partial(moveValidatedParam, config, output);

          // ensure that all of the declared params for the agg are declared on the config
          if (_.every(agg.params, moveToAggParams)) return output;
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
      return positions.global.concat(positions.split, positions.segment, positions.local, positions.metric);
    };
  };
});