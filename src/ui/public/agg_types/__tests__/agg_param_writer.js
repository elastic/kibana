import _ from 'lodash';
import { VisProvider } from 'ui/vis';
import { AggTypesIndexProvider } from 'ui/agg_types/index';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
module.exports = function AggParamWriterHelper(Private) {
  const Vis = Private(VisProvider);
  const aggTypes = Private(AggTypesIndexProvider);
  const visTypes = Private(VisTypesRegistryProvider);
  const stubbedLogstashIndexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

  /**
   * Helper object for writing aggParams. Specify an aggType and it will find a vis & schema, and
   * wire up the supporting objects required to feed in parameters, and get #write() output.
   *
   * Use cases:
   *  - Verify that the interval parameter of the histogram visualization casts its input to a number
   *    ```js
   *    it('casts to a number', function () {
   *      let writer = new AggParamWriter({ aggType: 'histogram' });
   *      let output = writer.write({ interval : '100/10' });
   *      expect(output.params.interval).to.be.a('number');
   *      expect(output.params.interval).to.be(100);
   *    });
   *    ```
   *
   * @class AggParamWriter
   * @param {object} opts - describe the properties of this paramWriter
   * @param {string} opts.aggType - the name of the aggType we want to test. ('histogram', 'filter', etc.)
   */
  function AggParamWriter(opts) {
    const self = this;

    self.aggType = opts.aggType;
    if (_.isString(self.aggType)) {
      self.aggType = aggTypes.byName[self.aggType];
    }

    // not configurable right now, but totally required
    self.indexPattern = stubbedLogstashIndexPattern;

    // the vis type we will use to write the aggParams
    self.visType = null;

    // the schema that the aggType satisfies
    self.visAggSchema = null;

    // find a suitable vis type and schema
    _.find(visTypes, function (visType) {
      const schema = _.find(visType.schemas.all, function (schema) {
        // type, type, type, type, type... :(
        return schema.group === self.aggType.type;
      });

      if (schema) {
        self.visType = visType;
        self.visAggSchema = schema;
        return true;
      }
    });

    if (!self.aggType || !self.visType || !self.visAggSchema) {
      throw new Error('unable to find a usable visType and schema for the ' + opts.aggType + ' agg type');
    }

    self.vis = new Vis(self.indexPattern, {
      type: self.visType
    });
  }

  AggParamWriter.prototype.write = function (paramValues) {
    const self = this;
    paramValues = _.clone(paramValues);

    if (self.aggType.params.byName.field && !paramValues.field) {
      // pick a field rather than force a field to be specified everywhere
      if (self.aggType.type === 'metrics') {
        paramValues.field = _.sample(self.indexPattern.fields.byType.number);
      } else {
        paramValues.field = _.sample(self.indexPattern.fields.byType.string);
      }
    }

    self.vis.setState({
      type: self.vis.type.name,
      aggs: [{
        type: self.aggType,
        schema: self.visAggSchema,
        params: paramValues
      }]
    });

    const aggConfig = _.find(self.vis.aggs, function (aggConfig) {
      return aggConfig.type === self.aggType;
    });

    aggConfig.type.params.forEach(function (param) {
      if (param.onRequest) {
        param.onRequest(aggConfig);
      }
    });

    return aggConfig.type.params.write(aggConfig);
  };

  return AggParamWriter;

};
