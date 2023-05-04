/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import { EsQueryParser } from './es_query_parser';

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

const rangeStart = 10 * day;
const rangeEnd = 12 * day;
const ctxArr = {
  bool: { must: [{ match_all: { c: 3 } }], must_not: [{ d: 4 }], filter: [{ f: 6 }] },
};
const ctxObj = {
  bool: { must: { match_all: { a: 1 } }, must_not: { b: 2 }, filter: { e: 6 } },
};

function create(min, max, dashboardCtx) {
  const inst = new EsQueryParser(
    {
      getTimeBounds: () => ({ min, max }),
    },
    () => {},
    cloneDeep(dashboardCtx),
    () => (inst.$$$warnCount = (inst.$$$warnCount || 0) + 1)
  );
  return inst;
}

jest.mock('../services');

describe(`EsQueryParser time`, () => {
  test(`roundInterval(4s)`, () => {
    expect(EsQueryParser._roundInterval(4 * second)).toBe(`1s`);
  });

  test(`roundInterval(4hr)`, () => {
    expect(EsQueryParser._roundInterval(4 * hour)).toBe(`3h`);
  });

  test(`getTimeBound`, () => {
    expect(create(1000, 2000)._getTimeBound({}, `min`)).toBe(1000);
  });

  test(`getTimeBound(shift 2d)`, () => {
    expect(create(5, 2000)._getTimeBound({ shift: 2 }, `min`)).toBe(5 + 2 * day);
  });

  test(`getTimeBound(shift -2hr)`, () => {
    expect(create(10 * day, 20 * day)._getTimeBound({ shift: -2, unit: `h` }, `min`)).toBe(
      10 * day - 2 * hour
    );
  });

  test(`createRangeFilter({})`, () => {
    const obj = {};
    const result = create(1000, 2000)._createRangeFilter(obj);

    expect(result).toEqual({
      format: 'strict_date_optional_time',
      gte: moment(1000).toISOString(),
      lte: moment(2000).toISOString(),
    });
    expect(result).toBe(obj);
  });

  test(`createRangeFilter(shift 1s)`, () => {
    const obj = { shift: 5, unit: 's' };
    const result = create(1000, 2000)._createRangeFilter(obj);

    expect(result).toEqual({
      format: 'strict_date_optional_time',
      gte: moment(6000).toISOString(),
      lte: moment(7000).toISOString(),
    });
    expect(result).toBe(obj);
  });
});

describe('EsQueryParser.populateData', () => {
  let searchApiStub;
  let data;
  let parser;

  beforeEach(() => {
    searchApiStub = {
      search: jest.fn(() => of(data)),
    };
    parser = new EsQueryParser({}, searchApiStub, undefined, undefined);
  });

  test('should set the timeout for each request', async () => {
    data = [
      { id: 0, rawResponse: {} },
      { id: 1, rawResponse: {} },
    ];
    await parser.populateData([
      { url: { body: {} }, dataObject: {} },
      { url: { body: {} }, dataObject: {} },
    ]);

    expect(searchApiStub.search.mock.calls[0][0][0].body).toBeDefined();
  });

  test('should remove possible timeout parameters on a request', async () => {
    data = [{ id: 0, rawResponse: {} }];
    await parser.populateData([{ url: { body: { timeout: '500h' } }, dataObject: {} }]);
    expect(searchApiStub.search.mock.calls[0][0][0].body.timeout).toBeDefined();
  });
});

describe(`EsQueryParser.injectQueryContextVars`, () => {
  function check(obj, expected, ctx) {
    return () => {
      create(rangeStart, rangeEnd, ctx)._injectContextVars(obj, true);
      expect(obj).toEqual(expected);
    };
  }

  test(`empty`, check({}, {}));
  test(`simple`, () => {
    const obj = { a: { c: 10 }, b: [{ d: 2 }, 4, 5], c: [], d: {} };
    check(obj, cloneDeep(obj));
  });
  test(`must clause empty`, check({ arr: ['%dashboard_context-must_clause%'] }, { arr: [] }, {}));
  test(
    `must clause arr`,
    check({ arr: ['%dashboard_context-must_clause%'] }, { arr: [...ctxArr.bool.must] }, ctxArr)
  );
  test(
    `must clause obj`,
    check({ arr: ['%dashboard_context-must_clause%'] }, { arr: [ctxObj.bool.must] }, ctxObj)
  );
  test(
    `mixed clause arr`,
    check(
      {
        arr: [
          1,
          '%dashboard_context-must_clause%',
          2,
          '%dashboard_context-must_not_clause%',
          3,
          '%dashboard_context-filter_clause%',
        ],
      },
      { arr: [1, ...ctxArr.bool.must, 2, ...ctxArr.bool.must_not, 3, ...ctxArr.bool.filter] },
      ctxArr
    )
  );
  test(
    `mixed clause obj`,
    check(
      {
        arr: [
          '%dashboard_context-must_clause%',
          1,
          '%dashboard_context-must_not_clause%',
          2,
          '%dashboard_context-filter_clause%',
          3,
        ],
      },
      { arr: [ctxObj.bool.must, 1, ctxObj.bool.must_not, 2, ctxObj.bool.filter, 3] },
      ctxObj
    )
  );
  test(
    `%autointerval% = true`,
    check(
      { date_histogram: { interval: { '%autointerval%': true } } },
      { date_histogram: { calendar_interval: `1h` } },
      ctxObj
    )
  );
  test(
    `%autointerval% = 10`,
    check(
      { date_histogram: { interval: { '%autointerval%': 10 } } },
      { date_histogram: { fixed_interval: `3h` } },
      ctxObj
    )
  );
  test(
    `histogram with interval`,
    check({ histogram: { interval: 1 } }, { histogram: { interval: 1 } }, ctxObj)
  );
  test(`%timefilter% = min`, check({ a: { '%timefilter%': 'min' } }, { a: rangeStart }));
  test(`%timefilter% = max`, check({ a: { '%timefilter%': 'max' } }, { a: rangeEnd }));
  test(
    `%timefilter% = true`,
    check(
      { a: { '%timefilter%': true } },
      {
        a: {
          format: 'strict_date_optional_time',
          gte: moment(rangeStart).toISOString(),
          lte: moment(rangeEnd).toISOString(),
        },
      }
    )
  );
});

describe(`EsQueryParser.parseEsRequest`, () => {
  function check(req, ctx, expected) {
    return () => {
      create(rangeStart, rangeEnd, ctx).parseUrl({}, req);
      expect(req).toEqual(expected);
    };
  }

  test(
    `%context_query%=true`,
    check({ index: '_all', '%context_query%': true }, ctxArr, {
      index: '_all',
      body: { query: ctxArr },
    })
  );

  test(
    `%context%=true`,
    check({ index: '_all', '%context%': true }, ctxArr, { index: '_all', body: { query: ctxArr } })
  );

  const expectedForCtxAndTimefield = {
    index: '_all',
    body: {
      query: {
        bool: {
          must: [
            { match_all: { c: 3 } },
            {
              range: {
                abc: {
                  format: 'strict_date_optional_time',
                  gte: moment(rangeStart).toISOString(),
                  lte: moment(rangeEnd).toISOString(),
                },
              },
            },
          ],
          must_not: [{ d: 4 }],
          filter: [{ f: 6 }],
        },
      },
    },
  };

  test(
    `%context_query%='abc'`,
    check({ index: '_all', '%context_query%': 'abc' }, ctxArr, expectedForCtxAndTimefield)
  );

  test(
    `%context%=true, %timefield%='abc'`,
    check(
      { index: '_all', '%context%': true, '%timefield%': 'abc' },
      ctxArr,
      expectedForCtxAndTimefield
    )
  );

  test(
    `%timefield%='abc'`,
    check({ index: '_all', '%timefield%': 'abc' }, ctxArr, {
      index: '_all',
      body: {
        query: {
          range: {
            abc: {
              format: 'strict_date_optional_time',
              gte: moment(rangeStart).toISOString(),
              lte: moment(rangeEnd).toISOString(),
            },
          },
        },
      },
    })
  );

  test(`no esRequest`, check({ index: '_all' }, ctxArr, { index: '_all', body: {} }));

  test(
    `esRequest`,
    check({ index: '_all', body: { query: 2 } }, ctxArr, {
      index: '_all',
      body: { query: 2 },
    })
  );
});
