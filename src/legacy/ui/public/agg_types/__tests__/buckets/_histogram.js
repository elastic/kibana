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
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { aggTypes } from '../..';
import chrome from '../../../chrome';
import AggParamWriterProvider from '../agg_param_writer';

const config = chrome.getUiSettingsClient();
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

    describe('intervalBase', () => {
      it('should not be written to the DSL', () => {
        const output = paramWriter.write({ intervalBase: 100 });
        expect(output.params).not.to.have.property('intervalBase');
      });
    });

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

      describe('interval scaling', () => {

        beforeEach(() => {
          sinon.stub(config, 'get');
        });

        it('will respect the histogram:maxBars setting', () => {
          config.get.withArgs('histogram:maxBars').returns(5);
          const output = paramWriter.write({ interval: 5 },
            aggConfig => aggConfig.setAutoBounds({ min: 0, max: 10000 }));
          expect(output.params).to.have.property('interval', 2000);
        });

        it('will return specified interval, if bars are below histogram:maxBars config', () => {
          config.get.withArgs('histogram:maxBars').returns(10000);
          const output = paramWriter.write({ interval: 5 },
            aggConfig => aggConfig.setAutoBounds({ min: 0, max: 10000 }));
          expect(output.params).to.have.property('interval', 5);
        });

        it('will set to intervalBase if interval is below base', () => {
          const output = paramWriter.write({ interval: 3, intervalBase: 8 });
          expect(output.params).to.have.property('interval', 8);
        });

        it('will round to nearest intervalBase multiple if interval is above base', () => {
          const roundUp = paramWriter.write({ interval: 46, intervalBase: 10 });
          expect(roundUp.params).to.have.property('interval', 50);
          const roundDown = paramWriter.write({ interval: 43, intervalBase: 10 });
          expect(roundDown.params).to.have.property('interval', 40);
        });

        it('will not change interval if it is a multiple of base', () => {
          const output = paramWriter.write({ interval: 35, intervalBase: 5 });
          expect(output.params).to.have.property('interval', 35);
        });

        it('will round to intervalBase after scaling histogram:maxBars', () => {
          config.get.withArgs('histogram:maxBars').returns(100);
          const output = paramWriter.write({ interval: 5, intervalBase: 6 },
            aggConfig => aggConfig.setAutoBounds({ min: 0, max: 1000 }));
          // 100 buckets in 0 to 1000 would result in an interval of 10, so we should
          // round to the next multiple of 6 -> 12
          expect(output.params).to.have.property('interval', 12);
        });

        afterEach(() => {
          config.get.restore();
        });
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

      it('writes 1 for falsy values', function () {
        let output = paramWriter.write({ min_doc_count: '' });
        expect(output.params).to.have.property('min_doc_count', 1);

        output = paramWriter.write({ min_doc_count: null });
        expect(output.params).to.have.property('min_doc_count', 1);

        output = paramWriter.write({ min_doc_count: undefined });
        expect(output.params).to.have.property('min_doc_count', 1);
      });
    });

    describe('extended_bounds', function () {
      it('does not write when only eb.min is set', function () {
        const output = paramWriter.write({
          has_extended_bounds: true,
          extended_bounds: { min: 0 }
        });
        expect(output.params).not.to.have.property('extended_bounds');
      });

      it('does not write when only eb.max is set', function () {
        const output = paramWriter.write({
          has_extended_bounds: true,
          extended_bounds: { max: 0 }
        });
        expect(output.params).not.to.have.property('extended_bounds');
      });

      it('writes when both eb.min and eb.max are set', function () {
        const output = paramWriter.write({
          has_extended_bounds: true,
          extended_bounds: { min: 99, max: 100 }
        });
        expect(output.params.extended_bounds).to.have.property('min', 99);
        expect(output.params.extended_bounds).to.have.property('max', 100);
      });

      it('does not write when nothing is set', function () {
        const output = paramWriter.write({
          has_extended_bounds: true,
          extended_bounds: {}
        });
        expect(output.params).to.not.have.property('extended_bounds');
      });

      it('does not write when has_extended_bounds is false', function () {
        const output = paramWriter.write({
          has_extended_bounds: false,
          extended_bounds: { min: 99, max: 100 }
        });
        expect(output.params).to.not.have.property('extended_bounds');
      });
    });
  });
});
