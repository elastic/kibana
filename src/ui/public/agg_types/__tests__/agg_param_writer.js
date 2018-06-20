/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { VisProvider } from '../../vis';
import { aggTypes } from '..';
import { VisTypesRegistryProvider } from '../../registry/vis_types';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AggConfig } from '../../vis/agg_config';

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function AggParamWriterHelper(Private) {
  const Vis = Private(VisProvider);
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
      type: self.visType.name
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
        const type = self.aggType.params.byName.field.filterFieldTypes || 'string';
        let field;
        do {
          field = _.sample(self.indexPattern.fields.byType[type]);
        } while (!field.aggregatable);
        paramValues.field = field.name;
      }
    }


    const agg = new AggConfig(self.vis, {
      id: 1,
      schema: self.visAggSchema.name,
      type: self.aggType.name,
      params: paramValues
    });

    self.vis.setState({
      type: self.vis.type.name,
      aggs: [agg.toJSON()]
    });

    const aggConfig = _.find(self.vis.aggs, function (aggConfig) {
      return aggConfig.type === self.aggType;
    });

    return aggConfig.type.params.write(aggConfig);
  };

  return AggParamWriter;

}
