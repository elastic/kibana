define(function (require) {
  return function AggConfigsFactory(Private) {
    var _ = require('lodash');
    var AggConfig = Private(require('components/vis/_agg_config'));
    var Registry = require('utils/registry');

    _(AggConfigs).inherits(Registry);
    function AggConfigs(vis, configStates) {
      this.vis = vis;
      AggConfigs.Super.call(this, {
        index: ['id'],
        group: ['schema.group'],
        initialSet: (configStates || []).map(function (aggConfigState) {
          return new AggConfig(vis, aggConfigState);
        })
      });
    }

    AggConfigs.prototype.toDSL = function () {
      var dsl = {};
      var current = dsl;

      this.getValid().forEach(function (agg) {
        if (agg.type.name === 'count') return;

        current.aggs = {};

        var aggDsl = {};
        var output = agg.type.params.write(agg);
        aggDsl[agg.type.name] = output.params;
        current = current.aggs[agg.id] = aggDsl;
      });

      // set the dsl to the searchSource
      return dsl.aggs || {};
    };

    AggConfigs.prototype.getValid = function () {
      return _(this)
        .filter(function (agg) {
          return agg.isValid();
        })
        .sortBy(function (agg) {
          return agg.schema.group === 'metrics' ? 1 : 0;
        })
        .valueOf();
    };

    return AggConfigs;
  };
});