define(function (require) {
  return function VisFactory(Notifier, Private) {
    var _ = require('lodash');
    var aggTypes = Private(require('components/agg_types/index'));
    var visTypes = Private(require('registry/vis_types'));
    var AggConfigs = Private(require('components/vis/_agg_configs'));

    var notify = new Notifier({
      location: 'Vis'
    });

    function Vis(indexPattern, state) {
      state = state || {};

      if (_.isString(state)) {
        state = {
          type: state
        };
      }

      this.indexPattern = indexPattern;

      // http://aphyr.com/data/posts/317/state.gif
      this.setState(state);
    }

    Vis.convertOldState = function (type, oldState) {
      if (!type || _.isString(type)) {
        type = visTypes.byName[type || 'histogram'];
      }

      var schemas = type.schemas;

      var aggs = _.transform(oldState, function (newConfigs, oldConfigs, oldGroupName) {
        var schema = schemas.all.byName[oldGroupName];

        if (!schema) {
          notify.log('unable to match old schema', oldGroupName, 'to a new schema');
          return;
        }

        oldConfigs.forEach(function (oldConfig) {
          var agg = {
            schema: schema.name,
            type: oldConfig.agg,
          };

          var aggType = aggTypes.byName[agg.type];
          if (!aggType) {
            notify.log('unable to find an agg type for old confg', oldConfig);
            return;
          }

          agg.params = _.pick(oldConfig, _.keys(aggType.params.byName));

          newConfigs.push(agg);
        });
      }, []);

      return {
        type: type,
        aggs: aggs
      };
    };

    Vis.prototype.type = 'histogram';

    Vis.prototype.setState = function (state) {
      this.type = state.type || this.type;
      if (_.isString(this.type)) this.type = visTypes.byName[this.type];

      this.listeners = _.assign({}, state.listeners, this.type.listeners);
      this.params = _.defaults({}, _.cloneDeep(state.params || {}), this.type.params.defaults || {});

      this.aggs = new AggConfigs(this, state.aggs);
    };

    Vis.prototype.getState = function () {
      return {
        type: this.type.name,
        params: this.params,
        aggs: this.aggs.map(function (agg) {
          return agg.toJSON();
        }).filter(Boolean),
        listeners: this.listeners
      };
    };

    Vis.prototype.createEditableVis = function () {
      return this._editableVis || (this._editableVis = this.clone());
    };

    Vis.prototype.getEditableVis = function () {
      return this._editableVis || undefined;
    };

    Vis.prototype.clone = function () {
      return new Vis(this.indexPattern, this.getState());
    };

    Vis.prototype.requesting = function () {
      _.invoke(this.aggs.getRequestAggs(), 'requesting');
    };

    Vis.prototype.isHierarchical = function () {
      if (_.isFunction(this.type.hierarchicalData)) {
        return !!this.type.hierarchicalData(this);
      } else {
        return !!this.type.hierarchicalData;
      }
    };

    Vis.prototype.hasSchemaAgg = function (schemaName, aggTypeName) {
      var aggs = this.aggs.bySchemaName[schemaName] || [];
      return aggs.some(function (agg) {
        if (!agg.type || !agg.type.name) return false;
        return agg.type.name === aggTypeName;
      });
    };

    return Vis;
  };
});
