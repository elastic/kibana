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

import { labels } from './labels';
import { dataArray } from './data_array';
import { uniqLabels } from './uniq_labels';
import { flattenSeries as getSeries } from './flatten_series';

let seriesLabels;
let rowsLabels;
let seriesArr;
let rowsArr;

const seriesData = {
  label: '',
  series: [
    {
      label: '100',
      values: [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 3 },
      ],
    },
  ],
};

const rowsData = {
  rows: [
    {
      label: 'a',
      series: [
        {
          label: '100',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
    {
      label: 'b',
      series: [
        {
          label: '300',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
    {
      label: 'c',
      series: [
        {
          label: '100',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
    {
      label: 'd',
      series: [
        {
          label: '200',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
  ],
};

const columnsData = {
  columns: [
    {
      label: 'a',
      series: [
        {
          label: '100',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
    {
      label: 'b',
      series: [
        {
          label: '300',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
    {
      label: 'c',
      series: [
        {
          label: '100',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
    {
      label: 'd',
      series: [
        {
          label: '200',
          values: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
      ],
    },
  ],
};

describe('Vislib Labels Module Test Suite', function () {
  let uniqSeriesLabels;
  describe('Labels (main)', function () {
    beforeEach(() => {
      seriesLabels = labels(seriesData);
      rowsLabels = labels(rowsData);
      seriesArr = Array.isArray(seriesLabels);
      rowsArr = Array.isArray(rowsLabels);
      uniqSeriesLabels = _.chain(rowsData.rows)
        .map('series')
        .flattenDeep()
        .map('label')
        .uniq()
        .value();
    });

    it('should be a function', function () {
      expect(typeof labels).toBe('function');
    });

    it('should return an array if input is data.series', function () {
      expect(seriesArr).toBe(true);
    });

    it('should return an array if input is data.rows', function () {
      expect(rowsArr).toBe(true);
    });

    it('should throw an error if input is not an object', function () {
      expect(function () {
        labels('string not object');
      }).toThrow();
    });

    it('should return unique label values', function () {
      expect(rowsLabels[0]).toEqual(uniqSeriesLabels[0]);
      expect(rowsLabels[1]).toEqual(uniqSeriesLabels[1]);
      expect(rowsLabels[2]).toEqual(uniqSeriesLabels[2]);
    });
  });

  describe('Data array', function () {
    const childrenObject = {
      children: [],
    };
    const seriesObject = {
      series: [],
    };
    const rowsObject = {
      rows: [],
    };
    const columnsObject = {
      columns: [],
    };
    const string = 'string';
    const number = 23;
    const boolean = false;
    const emptyArray = [];
    const nullValue = null;
    let notAValue;
    let testSeries;
    let testRows;

    beforeEach(() => {
      seriesLabels = dataArray(seriesData);
      rowsLabels = dataArray(rowsData);
      testSeries = Array.isArray(seriesLabels);
      testRows = Array.isArray(rowsLabels);
    });

    it('should throw an error if the input is not an object', function () {
      expect(function () {
        dataArray(string);
      }).toThrow();

      expect(function () {
        dataArray(number);
      }).toThrow();

      expect(function () {
        dataArray(boolean);
      }).toThrow();

      expect(function () {
        dataArray(emptyArray);
      }).toThrow();

      expect(function () {
        dataArray(nullValue);
      }).toThrow();

      expect(function () {
        dataArray(notAValue);
      }).toThrow();
    });

    it(
      'should throw an error if property series, rows, or ' + 'columns is not present',
      function () {
        expect(function () {
          dataArray(childrenObject);
        }).toThrow();
      }
    );

    it(
      'should not throw an error if object has property series, rows, or ' + 'columns',
      function () {
        expect(function () {
          dataArray(seriesObject);
        }).not.toThrow();

        expect(function () {
          dataArray(rowsObject);
        }).not.toThrow();

        expect(function () {
          dataArray(columnsObject);
        }).not.toThrow();
      }
    );

    it('should be a function', function () {
      expect(typeof dataArray).toEqual('function');
    });

    it('should return an array of objects if input is data.series', function () {
      expect(testSeries).toEqual(true);
    });

    it('should return an array of objects if input is data.rows', function () {
      expect(testRows).toEqual(true);
    });

    it('should return an array of same length as input data.series', function () {
      expect(seriesLabels.length).toEqual(seriesData.series.length);
    });

    it('should return an array of same length as input data.rows', function () {
      expect(rowsLabels.length).toEqual(rowsData.rows.length);
    });

    it('should return an array of objects with obj.labels and obj.values', function () {
      expect(seriesLabels[0].label).toEqual('100');
      expect(seriesLabels[0].values[0].x).toEqual(0);
      expect(seriesLabels[0].values[0].y).toEqual(1);
    });
  });

  describe('Unique labels', function () {
    const arrObj = [
      { label: 'a' },
      { label: 'b' },
      { label: 'b' },
      { label: 'c' },
      { label: 'c' },
      { label: 'd' },
      { label: 'f' },
    ];
    const string = 'string';
    const number = 24;
    const boolean = false;
    const nullValue = null;
    const emptyObject = {};
    const emptyArray = [];
    let notAValue;
    let uniq;
    let testArr;

    beforeEach(() => {
      uniq = uniqLabels(arrObj, function (d) {
        return d;
      });
      testArr = Array.isArray(uniq);
    });

    it('should throw an error if input is not an array', function () {
      expect(function () {
        uniqLabels(string);
      }).toThrow();

      expect(function () {
        uniqLabels(number);
      }).toThrow();

      expect(function () {
        uniqLabels(boolean);
      }).toThrow();

      expect(function () {
        uniqLabels(nullValue);
      }).toThrow();

      expect(function () {
        uniqLabels(emptyObject);
      }).toThrow();

      expect(function () {
        uniqLabels(notAValue);
      }).toThrow();
    });

    it('should not throw an error if the input is an array', function () {
      expect(function () {
        uniqLabels(emptyArray);
      }).not.toThrow();
    });

    it('should be a function', function () {
      expect(typeof uniqLabels).toBe('function');
    });

    it('should return an array', function () {
      expect(testArr).toBe(true);
    });

    it('should return array of 5 unique values', function () {
      expect(uniq.length).toBe(5);
    });
  });

  describe('Get series', function () {
    const string = 'string';
    const number = 24;
    const boolean = false;
    const nullValue = null;
    const rowsObject = {
      rows: [],
    };
    const columnsObject = {
      columns: [],
    };
    const emptyObject = {};
    const emptyArray = [];
    let notAValue;
    let columnsLabels;
    let rowsLabels;
    let columnsArr;
    let rowsArr;

    beforeEach(() => {
      columnsLabels = getSeries(columnsData);
      rowsLabels = getSeries(rowsData);
      columnsArr = Array.isArray(columnsLabels);
      rowsArr = Array.isArray(rowsLabels);
    });

    it('should throw an error if input is not an object', function () {
      expect(function () {
        getSeries(string);
      }).toThrow();

      expect(function () {
        getSeries(number);
      }).toThrow();

      expect(function () {
        getSeries(boolean);
      }).toThrow();

      expect(function () {
        getSeries(nullValue);
      }).toThrow();

      expect(function () {
        getSeries(emptyArray);
      }).toThrow();

      expect(function () {
        getSeries(notAValue);
      }).toThrow();
    });

    it('should throw an if property rows or columns is not set on the object', function () {
      expect(function () {
        getSeries(emptyObject);
      }).toThrow();
    });

    it('should not throw an error if rows or columns set on object', function () {
      expect(function () {
        getSeries(rowsObject);
      }).not.toThrow();

      expect(function () {
        getSeries(columnsObject);
      }).not.toThrow();
    });

    it('should be a function', function () {
      expect(typeof getSeries).toBe('function');
    });

    it('should return an array if input is data.columns', function () {
      expect(columnsArr).toBe(true);
    });

    it('should return an array if input is data.rows', function () {
      expect(rowsArr).toBe(true);
    });

    it('should return an array of the same length as as input data.columns', function () {
      expect(columnsLabels.length).toBe(columnsData.columns.length);
    });

    it('should return an array of the same length as as input data.rows', function () {
      expect(rowsLabels.length).toBe(rowsData.rows.length);
    });
  });
});
