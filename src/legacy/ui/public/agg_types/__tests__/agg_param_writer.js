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
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AggGroupNames } from '../../vis/editors/default/agg_groups';

// eslint-disable-next-line import/no-default-export
export default function AggParamWriterHelper(Private) {
  const Vis = Private(VisProvider);
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
  class AggParamWriter {
    constructor(opts) {
      this.aggType = opts.aggType;
      if (_.isString(this.aggType)) {
        this.aggType =
          aggTypes.buckets.find(agg => agg.name === this.aggType) ||
          aggTypes.metrics.find(agg => agg.name === this.aggType);
      }

      // not configurable right now, but totally required
      this.indexPattern = stubbedLogstashIndexPattern;

      // the schema that the aggType satisfies
      this.visAggSchema = null;

      this.vis = new Vis(this.indexPattern, {
        type: 'histogram',
        aggs: [
          {
            id: 1,
            type: this.aggType.name,
            params: {},
          },
        ],
      });
    }

    write(paramValues, modifyAggConfig = null) {
      paramValues = _.clone(paramValues);

      if (this.aggType.paramByName('field') && !paramValues.field) {
        // pick a field rather than force a field to be specified everywhere
        if (this.aggType.type === AggGroupNames.Metrics) {
          paramValues.field = _.sample(this.indexPattern.fields.getByType('number'));
        } else {
          const type = this.aggType.paramByName('field').filterFieldTypes || 'string';
          let field;
          do {
            field = _.sample(this.indexPattern.fields.getByType(type));
          } while (!field.aggregatable);
          paramValues.field = field.name;
        }
      }

      const aggConfig = this.vis.aggs.aggs[0];
      aggConfig.setParams(paramValues);

      if (modifyAggConfig) {
        modifyAggConfig(aggConfig);
      }

      return aggConfig.write(this.vis.aggs);
    }
  }

  return AggParamWriter;
}
