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

import expect from '@kbn/expect';
import { AggParams } from '../agg_params';
import { BaseParamType } from '../param_types/base';
import { FieldParamType } from '../param_types/field';
import { OptionedParamType } from '../param_types/optioned';
import { SelectParamType } from '../param_types/select';

describe('AggParams class', function () {

  describe('constructor args', function () {
    it('accepts an array of param defs', function () {
      const params = [
        { name: 'one' },
        { name: 'two' }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams).to.be.an(Array);
      expect(aggParams.byName).to.have.keys(['one', 'two']);
    });
  });

  describe('AggParam creation', function () {
    it('Uses the FieldParamType class for params with the name "field"', function () {
      const params = [
        { name: 'field', type: 'field' }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(FieldParamType);
    });

    it('Uses the OptionedParamType class for params of type "optioned"', function () {
      const params = [
        {
          name: 'interval',
          type: 'optioned'
        }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(OptionedParamType);
    });

    it('Uses the SelectParamType class for params of type "select"', function () {
      const params = [
        {
          name: 'order',
          type: 'select'
        }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(SelectParamType);
    });

    it('Always converts the params to a BaseParamType', function () {
      const params = [
        {
          name: 'height',
          editor: '<blink>high</blink>'
        },
        {
          name: 'weight',
          editor: '<blink>big</blink>'
        },
        {
          name: 'waist',
          editor: '<blink>small</blink>'
        }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      aggParams.forEach(function (aggParam) {
        expect(aggParam).to.be.a(BaseParamType);
      });
    });
  });
});
