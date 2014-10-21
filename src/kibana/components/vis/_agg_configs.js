define(function (require) {
  return function AggConfigsFactory(Private) {
    var _ = require('lodash');
    var AggConfig = Private(require('components/vis/_agg_config'));
    var Registry = require('utils/registry/registry');

    _(AggConfigs).inherits(Registry);
    function AggConfigs(vis, configStates) {
      var self = this;
      this.vis = vis;


      AggConfigs.Super.call(this, {
        index: ['id'],
        group: ['schema.group', 'type.name', 'schema.name'],
        initialSet: (configStates || []).map(function (aggConfigState) {
          if (aggConfigState instanceof AggConfig) return aggConfigState;
          return new AggConfig(vis, aggConfigState);
        })
      });


      // Set the defaults for any schema which has them. If the defaults
      // for some reason has more then the max only set the max number
      // of defaults (not sure why a someone define more...
      // but whatever). Also if a schema.name is already set then don't
      // set anything.
      if (vis && vis.type && vis.type.schemas && vis.type.schemas.all) {
        _(vis.type.schemas.all)
        .filter(function (schema) {
          return _.isArray(schema.defaults) && schema.defaults.length > 0;
        })
        .each(function (schema) {
          if (!self.bySchemaName[schema.name]) {
            var defaults = schema.defaults.slice(0, schema.max);
            _.each(defaults, function (def) {
              self.push(new AggConfig(vis, def));
            });
          }
        });
      }

    }

    AggConfigs.prototype.toDsl = function () {
      var dslTopLvl = {};
      var dslLvlCursor;
      var nestedMetric;

      if (this.vis.type.hierarchialData) {
        // collect the metric agg that we will copy under each bucket agg
        var nestedMetricConfig = _.first(this.vis.aggs.bySchemaGroup.metrics);
        if (nestedMetricConfig.type.name !== 'count') {
          nestedMetric = {
            config: nestedMetricConfig,
            dsl: nestedMetricConfig.toDsl()
          };
        }
      }

      this.getSorted()
      .filter(function (config) {
        return !config.type.hasNoDsl;
      })
      .forEach(function nestEachConfig(config, i, list) {
        var prevConfig = list[i - 1];
        var prevDsl = prevConfig && dslLvlCursor && dslLvlCursor[prevConfig.id];

        // advance the cursor and write to the previous agg
        if (prevDsl && prevConfig.schema.group === 'buckets') {
          dslLvlCursor = prevDsl.aggs;
        }

        // start at the top level
        if (!dslLvlCursor) dslLvlCursor = dslTopLvl;

        var dsl = dslLvlCursor[config.id] = config.toDsl();

        if (config.schema.group === 'buckets') {
          var subAggs = dsl.aggs || (dsl.aggs = {});
          if (nestedMetric) {
            subAggs[nestedMetric.config.id] = nestedMetric.dsl;
          }
        }
      });

      return dslTopLvl;
    };

    AggConfigs.prototype.getSorted = function () {
      return _.sortBy(this, function (agg) {
        return agg.schema.group === 'metrics' ? 1 : 0;
      });
    };

    return AggConfigs;
  };
});
