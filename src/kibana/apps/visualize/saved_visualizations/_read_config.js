define(function (require) {
  var _ = require('lodash');
  var configCategories = require('./_config_categories');
  var aggs = require('./_aggs');

  return function () {
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

    return positions.split.concat(positions.global, positions.segment, positions.local, positions.metric);
  };

});