define(function (require) {
  return function AggConfigsFactory(Private) {
    var _ = require('lodash');
    var AggConfig = Private(require('components/vis/_agg_config'));
    var IndexedArray = require('utils/indexed_array/index');

    _(AggConfigs).inherits(IndexedArray);
    function AggConfigs(vis, configStates) {
      var self = this;
      self.vis = vis;

      configStates = AggConfig.ensureIds(configStates || []);

      AggConfigs.Super.call(self, {
        index: ['id'],
        group: ['schema.group', 'type.name', 'schema.name'],
        initialSet: configStates.map(function (aggConfigState) {
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
            _.each(defaults, function (defaultState) {
              var state = _.defaults({ id: AggConfig.nextId(self) }, defaultState);
              self.push(new AggConfig(vis, state));
            });
          }
        });
      }
    }

    AggConfigs.prototype.toDsl = function () {
      var dslTopLvl = {};
      var dslLvlCursor;
      var nestedMetric;

      if (this.vis.isHierarchical()) {
        // collect all metrics, and filter out the ones that we won't be copying
        var nestedMetrics = _(this.vis.aggs.bySchemaGroup.metrics)
        .filter(function (agg) {
          return agg.type.name !== 'count';
        })
        .map(function (agg) {
          return {
            config: agg,
            dsl: agg.toDsl()
          };
        });
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

        if (subAggs && nestedMetrics) {
          nestedMetrics.forEach(function (agg) {
            subAggs[agg.config.id] = agg.dsl;
          });
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
