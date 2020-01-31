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
import expect from '@kbn/expect';
import { injectZeros } from './inject_zeros';
import { orderXValues } from './ordered_x_keys';
import { getUniqKeys } from './uniq_keys';
import { flattenData } from './flatten_data';
import { createZeroFilledArray } from './zero_filled_array';
import { zeroFillDataArray } from './zero_fill_data_array';

describe('Vislib Zero Injection Module Test Suite', function() {
  const dateHistogramRowsObj = {
    xAxisOrderedValues: [
      1418410560000,
      1418410620000,
      1418410680000,
      1418410740000,
      1418410800000,
      1418410860000,
      1418410920000,
    ],
    series: [
      {
        label: 'html',
        values: [
          { x: 1418410560000, y: 2 },
          { x: 1418410620000, y: 4 },
          { x: 1418410680000, y: 1 },
          { x: 1418410740000, y: 5 },
          { x: 1418410800000, y: 2 },
          { x: 1418410860000, y: 3 },
          { x: 1418410920000, y: 2 },
        ],
      },
      {
        label: 'css',
        values: [
          { x: 1418410560000, y: 1 },
          { x: 1418410620000, y: 3 },
          { x: 1418410680000, y: 1 },
          { x: 1418410740000, y: 4 },
          { x: 1418410800000, y: 2 },
        ],
      },
    ],
  };
  const dateHistogramRows = dateHistogramRowsObj.series;

  const seriesDataObj = {
    xAxisOrderedValues: ['v1', 'v2', 'v3', 'v4', 'v5'],
    series: [
      {
        label: '200',
        values: [
          { x: 'v1', y: 234 },
          { x: 'v2', y: 34 },
          { x: 'v3', y: 834 },
          { x: 'v4', y: 1234 },
          { x: 'v5', y: 4 },
        ],
      },
    ],
  };
  const seriesData = seriesDataObj.series;

  const multiSeriesDataObj = {
    xAxisOrderedValues: ['1', '2', '3', '4', '5'],
    series: [
      {
        label: '200',
        values: [
          { x: '1', y: 234 },
          { x: '2', y: 34 },
          { x: '3', y: 834 },
          { x: '4', y: 1234 },
          { x: '5', y: 4 },
        ],
      },
      {
        label: '404',
        values: [{ x: '1', y: 1234 }, { x: '3', y: 234 }, { x: '5', y: 34 }],
      },
      {
        label: '503',
        values: [{ x: '3', y: 834 }],
      },
    ],
  };
  const multiSeriesData = multiSeriesDataObj.series;

  const multiSeriesNumberedDataObj = {
    xAxisOrderedValues: [1, 2, 3, 4, 5],
    series: [
      {
        label: '200',
        values: [
          { x: 1, y: 234 },
          { x: 2, y: 34 },
          { x: 3, y: 834 },
          { x: 4, y: 1234 },
          { x: 5, y: 4 },
        ],
      },
      {
        label: '404',
        values: [{ x: 1, y: 1234 }, { x: 3, y: 234 }, { x: 5, y: 34 }],
      },
      {
        label: '503',
        values: [{ x: 3, y: 834 }],
      },
    ],
  };
  const multiSeriesNumberedData = multiSeriesNumberedDataObj.series;

  const emptyObject = {};
  const str = 'string';
  const number = 24;
  const boolean = false;
  const nullValue = null;
  const emptyArray = [];
  let notAValue;

  describe('Zero Injection (main)', function() {
    let sample1;
    let sample2;
    let sample3;

    beforeEach(() => {
      sample1 = injectZeros(seriesData, seriesDataObj);
      sample2 = injectZeros(multiSeriesData, multiSeriesDataObj);
      sample3 = injectZeros(multiSeriesNumberedData, multiSeriesNumberedDataObj);
    });

    it('should be a function', function() {
      expect(_.isFunction(injectZeros)).to.be(true);
    });

    it('should return an object with series[0].values', function() {
      expect(_.isObject(sample1)).to.be(true);
      expect(_.isObject(sample1[0].values)).to.be(true);
    });

    it('should return the same array of objects when the length of the series array is 1', function() {
      expect(sample1[0].values[0].x).to.be(seriesData[0].values[0].x);
      expect(sample1[0].values[1].x).to.be(seriesData[0].values[1].x);
      expect(sample1[0].values[2].x).to.be(seriesData[0].values[2].x);
      expect(sample1[0].values[3].x).to.be(seriesData[0].values[3].x);
      expect(sample1[0].values[4].x).to.be(seriesData[0].values[4].x);
    });

    it('should inject zeros in the input array', function() {
      expect(sample2[1].values[1].y).to.be(0);
      expect(sample2[2].values[0].y).to.be(0);
      expect(sample2[2].values[1].y).to.be(0);
      expect(sample2[2].values[4].y).to.be(0);
      expect(sample3[1].values[1].y).to.be(0);
      expect(sample3[2].values[0].y).to.be(0);
      expect(sample3[2].values[1].y).to.be(0);
      expect(sample3[2].values[4].y).to.be(0);
    });

    it('should return values arrays with the same x values', function() {
      expect(sample2[1].values[0].x).to.be(sample2[2].values[0].x);
      expect(sample2[1].values[1].x).to.be(sample2[2].values[1].x);
      expect(sample2[1].values[2].x).to.be(sample2[2].values[2].x);
      expect(sample2[1].values[3].x).to.be(sample2[2].values[3].x);
      expect(sample2[1].values[4].x).to.be(sample2[2].values[4].x);
    });

    it('should return values arrays of the same length', function() {
      expect(sample2[0].values.length).to.be(sample2[1].values.length);
      expect(sample2[0].values.length).to.be(sample2[2].values.length);
      expect(sample2[1].values.length).to.be(sample2[2].values.length);
    });
  });

  describe('Order X Values', function() {
    let results;
    let numberedResults;

    beforeEach(() => {
      results = orderXValues(multiSeriesDataObj);
      numberedResults = orderXValues(multiSeriesNumberedDataObj);
    });

    it('should return a function', function() {
      expect(_.isFunction(orderXValues)).to.be(true);
    });

    it('should return an array', function() {
      expect(Array.isArray(results)).to.be(true);
    });

    it('should return an array of values ordered by their index by default', function() {
      expect(results[0]).to.be('1');
      expect(results[1]).to.be('2');
      expect(results[2]).to.be('3');
      expect(results[3]).to.be('4');
      expect(results[4]).to.be('5');
      expect(numberedResults[0]).to.be(1);
      expect(numberedResults[1]).to.be(2);
      expect(numberedResults[2]).to.be(3);
      expect(numberedResults[3]).to.be(4);
      expect(numberedResults[4]).to.be(5);
    });

    it('should return an array of values that preserve the index from xAxisOrderedValues', function() {
      const data = {
        xAxisOrderedValues: ['1', '2', '3', '4', '5'],
        series: [
          {
            label: '200',
            values: [{ x: '2', y: 34 }, { x: '4', y: 1234 }],
          },
          {
            label: '404',
            values: [{ x: '1', y: 1234 }, { x: '3', y: 234 }, { x: '5', y: 34 }],
          },
          {
            label: '503',
            values: [{ x: '3', y: 834 }],
          },
        ],
      };
      const result = orderXValues(data);
      expect(result).to.eql(['1', '2', '3', '4', '5']);
    });

    it('should return an array of values ordered by their sum when orderBucketsBySum is true', function() {
      const orderBucketsBySum = true;
      results = orderXValues(multiSeriesDataObj, orderBucketsBySum);
      numberedResults = orderXValues(multiSeriesNumberedDataObj, orderBucketsBySum);

      expect(results[0]).to.be('3');
      expect(results[1]).to.be('1');
      expect(results[2]).to.be('4');
      expect(results[3]).to.be('5');
      expect(results[4]).to.be('2');
      expect(numberedResults[0]).to.be(3);
      expect(numberedResults[1]).to.be(1);
      expect(numberedResults[2]).to.be(4);
      expect(numberedResults[3]).to.be(5);
      expect(numberedResults[4]).to.be(2);
    });
  });

  describe('Unique Keys', function() {
    let results;

    beforeEach(() => {
      results = getUniqKeys(multiSeriesDataObj);
    });

    it('should throw an error if input is not an object', function() {
      expect(function() {
        getUniqKeys(str);
      }).to.throwError();

      expect(function() {
        getUniqKeys(number);
      }).to.throwError();

      expect(function() {
        getUniqKeys(boolean);
      }).to.throwError();

      expect(function() {
        getUniqKeys(nullValue);
      }).to.throwError();

      expect(function() {
        getUniqKeys(emptyArray);
      }).to.throwError();

      expect(function() {
        getUniqKeys(notAValue);
      }).to.throwError();
    });

    it('should return a function', function() {
      expect(_.isFunction(getUniqKeys)).to.be(true);
    });

    it('should return an object', function() {
      expect(_.isObject(results)).to.be(true);
    });

    it('should return an object of unique keys', function() {
      expect(_.uniq(_.keys(results)).length).to.be(_.keys(results).length);
    });
  });

  describe('Flatten Data', function() {
    let results;

    beforeEach(() => {
      results = flattenData(multiSeriesDataObj);
    });

    it('should return a function', function() {
      expect(_.isFunction(flattenData)).to.be(true);
    });

    it('should return an array', function() {
      expect(Array.isArray(results)).to.be(true);
    });

    it('should return an array of objects', function() {
      expect(_.isObject(results[0])).to.be(true);
      expect(_.isObject(results[1])).to.be(true);
      expect(_.isObject(results[2])).to.be(true);
    });
  });

  describe('Zero Filled Array', function() {
    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = ['1', '2', '3', '4', '5'];
    let results1;
    let results2;

    beforeEach(() => {
      results1 = createZeroFilledArray(arr1);
      results2 = createZeroFilledArray(arr2);
    });

    it('should throw an error if input is not an array', function() {
      expect(function() {
        createZeroFilledArray(str);
      }).to.throwError();

      expect(function() {
        createZeroFilledArray(number);
      }).to.throwError();

      expect(function() {
        createZeroFilledArray(boolean);
      }).to.throwError();

      expect(function() {
        createZeroFilledArray(nullValue);
      }).to.throwError();

      expect(function() {
        createZeroFilledArray(emptyObject);
      }).to.throwError();

      expect(function() {
        createZeroFilledArray(notAValue);
      }).to.throwError();
    });

    it('should return a function', function() {
      expect(_.isFunction(createZeroFilledArray)).to.be(true);
    });

    it('should return an array', function() {
      expect(Array.isArray(results1)).to.be(true);
    });

    it('should return an array of objects', function() {
      expect(_.isObject(results1[0])).to.be(true);
      expect(_.isObject(results1[1])).to.be(true);
      expect(_.isObject(results1[2])).to.be(true);
      expect(_.isObject(results1[3])).to.be(true);
      expect(_.isObject(results1[4])).to.be(true);
    });

    it('should return an array of objects where each y value is 0', function() {
      expect(results1[0].y).to.be(0);
      expect(results1[1].y).to.be(0);
      expect(results1[2].y).to.be(0);
      expect(results1[3].y).to.be(0);
      expect(results1[4].y).to.be(0);
    });

    it('should return an array of objects where each x values are numbers', function() {
      expect(_.isNumber(results1[0].x)).to.be(true);
      expect(_.isNumber(results1[1].x)).to.be(true);
      expect(_.isNumber(results1[2].x)).to.be(true);
      expect(_.isNumber(results1[3].x)).to.be(true);
      expect(_.isNumber(results1[4].x)).to.be(true);
    });

    it('should return an array of objects where each x values are strings', function() {
      expect(_.isString(results2[0].x)).to.be(true);
      expect(_.isString(results2[1].x)).to.be(true);
      expect(_.isString(results2[2].x)).to.be(true);
      expect(_.isString(results2[3].x)).to.be(true);
      expect(_.isString(results2[4].x)).to.be(true);
    });
  });

  describe('Zero Filled Data Array', function() {
    const xValueArr = [1, 2, 3, 4, 5];
    let arr1;
    const arr2 = [{ x: 3, y: 834 }];
    let results;

    beforeEach(() => {
      arr1 = createZeroFilledArray(xValueArr);
      // Takes zero array as 1st arg and data array as 2nd arg
      results = zeroFillDataArray(arr1, arr2);
    });

    it('should throw an error if input are not arrays', function() {
      expect(function() {
        zeroFillDataArray(str, str);
      }).to.throwError();

      expect(function() {
        zeroFillDataArray(number, number);
      }).to.throwError();

      expect(function() {
        zeroFillDataArray(boolean, boolean);
      }).to.throwError();

      expect(function() {
        zeroFillDataArray(nullValue, nullValue);
      }).to.throwError();

      expect(function() {
        zeroFillDataArray(emptyObject, emptyObject);
      }).to.throwError();

      expect(function() {
        zeroFillDataArray(notAValue, notAValue);
      }).to.throwError();
    });

    it('should return a function', function() {
      expect(_.isFunction(zeroFillDataArray)).to.be(true);
    });

    it('should return an array', function() {
      expect(Array.isArray(results)).to.be(true);
    });

    it('should return an array of objects', function() {
      expect(_.isObject(results[0])).to.be(true);
      expect(_.isObject(results[1])).to.be(true);
      expect(_.isObject(results[2])).to.be(true);
    });

    it('should return an array with zeros injected in the appropriate objects as y values', function() {
      expect(results[0].y).to.be(0);
      expect(results[1].y).to.be(0);
      expect(results[3].y).to.be(0);
      expect(results[4].y).to.be(0);
    });
  });

  describe('Injected Zero values return in the correct order', function() {
    let results;

    beforeEach(() => {
      results = injectZeros(dateHistogramRows, dateHistogramRowsObj);
    });

    it('should return an array of objects', function() {
      results.forEach(function(row) {
        expect(Array.isArray(row.values)).to.be(true);
      });
    });

    it('should return ordered x values', function() {
      const values = results[0].values;
      expect(values[0].x).to.be.lessThan(values[1].x);
      expect(values[1].x).to.be.lessThan(values[2].x);
      expect(values[2].x).to.be.lessThan(values[3].x);
      expect(values[3].x).to.be.lessThan(values[4].x);
      expect(values[4].x).to.be.lessThan(values[5].x);
      expect(values[5].x).to.be.lessThan(values[6].x);
    });
  });
});
