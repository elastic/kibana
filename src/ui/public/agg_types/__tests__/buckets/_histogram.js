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

import expect from 'expect.js';
import ngMock from 'ng_mock';
import { aggTypes } from '../..';
import AggParamWriterProvider from '../agg_param_writer';

const histogram = aggTypes.byName.histogram;
describe('Histogram Agg', function () {

  describe('ordered', function () {

    it('is ordered', function () {
      expect(histogram.ordered).to.be.ok();
    });

    it('is not ordered by date', function () {
      expect(histogram.ordered).to.not.have.property('date');
    });
  });


  describe('params', function () {
    let paramWriter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      const AggParamWriter = Private(AggParamWriterProvider);
      paramWriter = new AggParamWriter({ aggType: 'histogram' });
    }));

    describe('interval', function () {
      // reads aggConfig.params.interval, writes to dsl.interval

      it('accepts a whole number', function () {
        const output = paramWriter.write({ interval: 100 });
        expect(output.params).to.have.property('interval', 100);
      });

      it('accepts a decimal number', function () {
        const output = paramWriter.write({ interval: 0.1 });
        expect(output.params).to.have.property('interval', 0.1);
      });

      it('accepts a decimal number string', function () {
        const output = paramWriter.write({ interval: '0.1' });
        expect(output.params).to.have.property('interval', 0.1);
      });

      it('accepts a whole number string', function () {
        const output = paramWriter.write({ interval: '10' });
        expect(output.params).to.have.property('interval', 10);
      });

      it('fails on non-numeric values', function () {
        // template validation prevents this from users, not devs
        const output = paramWriter.write({ interval: [] });
        expect(isNaN(output.params.interval)).to.be.ok();
      });
    });

    describe('min_doc_count', function () {
      it('casts true values to 0', function () {
        let output = paramWriter.write({ min_doc_count: true });
        expect(output.params).to.have.property('min_doc_count', 0);

        output = paramWriter.write({ min_doc_count: 'yes' });
        expect(output.params).to.have.property('min_doc_count', 0);

        output = paramWriter.write({ min_doc_count: 1 });
        expect(output.params).to.have.property('min_doc_count', 0);

        output = paramWriter.write({ min_doc_count: {} });
        expect(output.params).to.have.property('min_doc_count', 0);
      });

      it('writes 1 for falsey values', function () {
        let output = paramWriter.write({ min_doc_count: '' });
        expect(output.params).to.have.property('min_doc_count', 1);

        output = paramWriter.write({ min_doc_count: null });
        expect(output.params).to.have.property('min_doc_count', 1);

        output = paramWriter.write({ min_doc_count: undefined });
        expect(output.params).to.have.property('min_doc_count', 1);
      });
    });

    describe('extended_bounds', function () {
      it('writes when only eb.min is set', function () {
        const output = paramWriter.write({
          min_doc_count: true,
          extended_bounds: { min: 0 }
        });
        expect(output.params.extended_bounds).to.have.property('min', 0);
        expect(output.params.extended_bounds).to.have.property('max', undefined);
      });

      it('writes when only eb.max is set', function () {
        const output = paramWriter.write({
          min_doc_count: true,
          extended_bounds: { max: 0 }
        });
        expect(output.params.extended_bounds).to.have.property('min', undefined);
        expect(output.params.extended_bounds).to.have.property('max', 0);
      });

      it('writes when both eb.min and eb.max are set', function () {
        const output = paramWriter.write({
          min_doc_count: true,
          extended_bounds: { min: 99, max: 100 }
        });
        expect(output.params.extended_bounds).to.have.property('min', 99);
        expect(output.params.extended_bounds).to.have.property('max', 100);
      });

      it('does not write when nothing is set', function () {
        const output = paramWriter.write({
          min_doc_count: true,
          extended_bounds: {}
        });
        expect(output.params).to.not.have.property('extended_bounds');
      });

      it('does not write when min_doc_count is false', function () {
        const output = paramWriter.write({
          min_doc_count: false,
          extended_bounds: { min: 99, max: 100 }
        });
        expect(output.params).to.not.have.property('extended_bounds');
      });
    });
  });
});
