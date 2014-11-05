define(function (require) {
  return function AggConfigsFactory(Private) {
    var _ = require('lodash');
    var AggConfig = Private(require('components/vis/_agg_config'));
    var IndexedArray = require('utils/indexed_array/index');

    _(AggConfigs).inherits(IndexedArray);
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

      if (this.vis.type.hierarchicalData) {
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
        if (!dslLvlCursor) {
          // start at the top level
          dslLvlCursor = dslTopLvl;
        } else {
          var prevConfig = list[i - 1];
          var prevDsl = dslLvlCursor[prevConfig.id];

          // advance the cursor and nest under the previous agg, or
          // put it on the same level if the previous agg doesn't accept
          // sub aggs
          dslLvlCursor = prevDsl.aggs || dslLvlCursor;
        }

        var dsl = dslLvlCursor[config.id] = config.toDsl();
        var subAggs;

        if (config.schema.group === 'buckets' && i < list.length - 1) {
          // buckets that are not the last item in the list accept sub-aggs
          subAggs = dsl.aggs || (dsl.aggs = {});
        }

        if (subAggs && nestedMetric) {
          subAggs[nestedMetric.config.id] = nestedMetric.dsl;
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
