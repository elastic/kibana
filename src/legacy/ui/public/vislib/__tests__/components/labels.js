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
import ngMock from 'ng_mock';
import { labels } from '../../components/labels/labels';
import { dataArray } from '../../components/labels/data_array';
import { uniqLabels } from '../../components/labels/uniq_labels';
import { flattenSeries as getSeries } from '../../components/labels/flatten_series';

let seriesLabels;
let rowsLabels;
let seriesArr;
let rowsArr;

const seriesData = {
  label: '',
  series: [
    {
      label: '100',
      values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
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
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
        },
      ],
    },
    {
      label: 'b',
      series: [
        {
          label: '300',
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
        },
      ],
    },
    {
      label: 'c',
      series: [
        {
          label: '100',
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
        },
      ],
    },
    {
      label: 'd',
      series: [
        {
          label: '200',
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
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
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
        },
      ],
    },
    {
      label: 'b',
      series: [
        {
          label: '300',
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
        },
      ],
    },
    {
      label: 'c',
      series: [
        {
          label: '100',
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
        },
      ],
    },
    {
      label: 'd',
      series: [
        {
          label: '200',
          values: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
        },
      ],
    },
  ],
};

describe('Vislib Labels Module Test Suite', function() {
  let uniqSeriesLabels;
  describe('Labels (main)', function() {
    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function() {
        seriesLabels = labels(seriesData);
        rowsLabels = labels(rowsData);
        seriesArr = Array.isArray(seriesLabels);
        rowsArr = Array.isArray(rowsLabels);
        uniqSeriesLabels = _.chain(rowsData.rows)
          .pluck('series')
          .flattenDeep()
          .pluck('label')
          .uniq()
          .value();
      })
    );

    it('should be a function', function() {
      expect(typeof labels).to.be('function');
    });

    it('should return an array if input is data.series', function() {
      expect(seriesArr).to.be(true);
    });

    it('should return an array if input is data.rows', function() {
      expect(rowsArr).to.be(true);
    });

    it('should throw an error if input is not an object', function() {
      expect(function() {
        labels('string not object');
      }).to.throwError();
    });

    it('should return unique label values', function() {
      expect(rowsLabels[0]).to.equal(uniqSeriesLabels[0]);
      expect(rowsLabels[1]).to.equal(uniqSeriesLabels[1]);
      expect(rowsLabels[2]).to.equal(uniqSeriesLabels[2]);
    });
  });

  describe('Data array', function() {
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

    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function() {
        seriesLabels = dataArray(seriesData);
        rowsLabels = dataArray(rowsData);
        testSeries = Array.isArray(seriesLabels);
        testRows = Array.isArray(rowsLabels);
      })
    );

    it('should throw an error if the input is not an object', function() {
      expect(function() {
        dataArray(string);
      }).to.throwError();

      expect(function() {
        dataArray(number);
      }).to.throwError();

      expect(function() {
        dataArray(boolean);
      }).to.throwError();

      expect(function() {
        dataArray(emptyArray);
      }).to.throwError();

      expect(function() {
        dataArray(nullValue);
      }).to.throwError();

      expect(function() {
        dataArray(notAValue);
      }).to.throwError();
    });

    it(
      'should throw an error if property series, rows, or ' + 'columns is not present',
      function() {
        expect(function() {
          dataArray(childrenObject);
        }).to.throwError();
      }
    );

    it(
      'should not throw an error if object has property series, rows, or ' + 'columns',
      function() {
        expect(function() {
          dataArray(seriesObject);
        }).to.not.throwError();

        expect(function() {
          dataArray(rowsObject);
        }).to.not.throwError();

        expect(function() {
          dataArray(columnsObject);
        }).to.not.throwError();
      }
    );

    it('should be a function', function() {
      expect(typeof dataArray).to.equal('function');
    });

    it('should return an array of objects if input is data.series', function() {
      expect(testSeries).to.equal(true);
    });

    it('should return an array of objects if input is data.rows', function() {
      expect(testRows).to.equal(true);
    });

    it('should return an array of same length as input data.series', function() {
      expect(seriesLabels.length).to.equal(seriesData.series.length);
    });

    it('should return an array of same length as input data.rows', function() {
      expect(rowsLabels.length).to.equal(rowsData.rows.length);
    });

    it('should return an array of objects with obj.labels and obj.values', function() {
      expect(seriesLabels[0].label).to.equal('100');
      expect(seriesLabels[0].values[0].x).to.equal(0);
      expect(seriesLabels[0].values[0].y).to.equal(1);
    });
  });

  describe('Unique labels', function() {
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

    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function() {
        uniq = uniqLabels(arrObj, function(d) {
          return d;
        });
        testArr = Array.isArray(uniq);
      })
    );

    it('should throw an error if input is not an array', function() {
      expect(function() {
        uniqLabels(string);
      }).to.throwError();

      expect(function() {
        uniqLabels(number);
      }).to.throwError();

      expect(function() {
        uniqLabels(boolean);
      }).to.throwError();

      expect(function() {
        uniqLabels(nullValue);
      }).to.throwError();

      expect(function() {
        uniqLabels(emptyObject);
      }).to.throwError();

      expect(function() {
        uniqLabels(notAValue);
      }).to.throwError();
    });

    it('should not throw an error if the input is an array', function() {
      expect(function() {
        uniqLabels(emptyArray);
      }).to.not.throwError();
    });

    it('should be a function', function() {
      expect(typeof uniqLabels).to.be('function');
    });

    it('should return an array', function() {
      expect(testArr).to.be(true);
    });

    it('should return array of 5 unique values', function() {
      expect(uniq.length).to.be(5);
    });
  });

  describe('Get series', function() {
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

    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function() {
        columnsLabels = getSeries(columnsData);
        rowsLabels = getSeries(rowsData);
        columnsArr = Array.isArray(columnsLabels);
        rowsArr = Array.isArray(rowsLabels);
      })
    );

    it('should throw an error if input is not an object', function() {
      expect(function() {
        getSeries(string);
      }).to.throwError();

      expect(function() {
        getSeries(number);
      }).to.throwError();

      expect(function() {
        getSeries(boolean);
      }).to.throwError();

      expect(function() {
        getSeries(nullValue);
      }).to.throwError();

      expect(function() {
        getSeries(emptyArray);
      }).to.throwError();

      expect(function() {
        getSeries(notAValue);
      }).to.throwError();
    });

    it('should throw an if property rows or columns is not set on the object', function() {
      expect(function() {
        getSeries(emptyObject);
      }).to.throwError();
    });

    it('should not throw an error if rows or columns set on object', function() {
      expect(function() {
        getSeries(rowsObject);
      }).to.not.throwError();

      expect(function() {
        getSeries(columnsObject);
      }).to.not.throwError();
    });

    it('should be a function', function() {
      expect(typeof getSeries).to.be('function');
    });

    it('should return an array if input is data.columns', function() {
      expect(columnsArr).to.be(true);
    });

    it('should return an array if input is data.rows', function() {
      expect(rowsArr).to.be(true);
    });

    it('should return an array of the same length as as input data.columns', function() {
      expect(columnsLabels.length).to.be(columnsData.columns.length);
    });

    it('should return an array of the same length as as input data.rows', function() {
      expect(rowsLabels.length).to.be(rowsData.rows.length);
    });
  });
});
