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
import sinon from 'sinon';
import moment from 'moment';
import { EsQueryParser } from '../es_query_parser';

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

const rangeStart = 10 * day;
const rangeEnd = 12 * day;
const ctxArr = { bool: { must: [{ match_all: { c: 3 } }], must_not: [{ d: 4 }] } };
const ctxObj = { bool: { must: { match_all: { a: 1 } }, must_not: { b: 2 } } };

function create(min, max, dashboardCtx) {
  const inst = new EsQueryParser(
    {
      getTimeBounds: () => ({ min, max }),
    },
    () => {},
    _.cloneDeep(dashboardCtx),
    () => (inst.$$$warnCount = (inst.$$$warnCount || 0) + 1)
  );
  return inst;
}

describe(`EsQueryParser time`, () => {
  it(`roundInterval(4s)`, () => expect(EsQueryParser._roundInterval(4 * second)).to.be(`1s`));
  it(`roundInterval(4hr)`, () => expect(EsQueryParser._roundInterval(4 * hour)).to.be(`3h`));
  it(`getTimeBound`, () => expect(create(1000, 2000)._getTimeBound({}, `min`)).to.be(1000));
  it(`getTimeBound(shift 2d)`, () =>
    expect(create(5, 2000)._getTimeBound({ shift: 2 }, `min`)).to.be(5 + 2 * day));
  it(`getTimeBound(shift -2hr)`, () =>
    expect(create(10 * day, 20 * day)._getTimeBound({ shift: -2, unit: `h` }, `min`)).to.be(
      10 * day - 2 * hour
    ));
  it(`createRangeFilter({})`, () => {
    const obj = {};
    expect(create(1000, 2000)._createRangeFilter(obj))
      .to.eql({
        format: 'strict_date_optional_time',
        gte: moment(1000).toISOString(),
        lte: moment(2000).toISOString(),
      })
      .and.to.be(obj);
  });
  it(`createRangeFilter(shift 1s)`, () => {
    const obj = { shift: 5, unit: 's' };
    expect(create(1000, 2000)._createRangeFilter(obj))
      .to.eql({
        format: 'strict_date_optional_time',
        gte: moment(6000).toISOString(),
        lte: moment(7000).toISOString(),
      })
      .and.to.be(obj);
  });
});

describe('EsQueryParser.populateData', () => {
  let searchStub;
  let parser;

  beforeEach(() => {
    searchStub = sinon.stub();
    parser = new EsQueryParser({}, { search: searchStub }, undefined, undefined);

    searchStub.returns(Promise.resolve([{}, {}]));
  });
  it('should set the timeout for each request', async () => {
    await parser.populateData([
      { url: { body: {} }, dataObject: {} },
      { url: { body: {} }, dataObject: {} },
    ]);
    expect(searchStub.firstCall.args[0][0].body.timeout).to.be.defined;
  });

  it('should remove possible timeout parameters on a request', async () => {
    await parser.populateData([
      { url: { timeout: '500h', body: { timeout: '500h' } }, dataObject: {} },
    ]);
    expect(searchStub.firstCall.args[0][0].body.timeout).to.be.defined;
    expect(searchStub.firstCall.args[0][0].timeout).to.be(undefined);
  });
});

describe(`EsQueryParser.injectQueryContextVars`, () => {
  function test(obj, expected, ctx) {
    return () => {
      create(rangeStart, rangeEnd, ctx)._injectContextVars(obj, true);
      expect(obj).to.eql(expected);
    };
  }

  it(`empty`, test({}, {}));
  it(`simple`, () => {
    const obj = { a: { c: 10 }, b: [{ d: 2 }, 4, 5], c: [], d: {} };
    test(obj, _.cloneDeep(obj));
  });
  it(`must clause empty`, test({ arr: ['%dashboard_context-must_clause%'] }, { arr: [] }, {}));
  it(
    `must clause arr`,
    test({ arr: ['%dashboard_context-must_clause%'] }, { arr: [...ctxArr.bool.must] }, ctxArr)
  );
  it(
    `must clause obj`,
    test({ arr: ['%dashboard_context-must_clause%'] }, { arr: [ctxObj.bool.must] }, ctxObj)
  );
  it(
    `mixed clause arr`,
    test(
      { arr: [1, '%dashboard_context-must_clause%', 2, '%dashboard_context-must_not_clause%'] },
      { arr: [1, ...ctxArr.bool.must, 2, ...ctxArr.bool.must_not] },
      ctxArr
    )
  );
  it(
    `mixed clause obj`,
    test(
      { arr: ['%dashboard_context-must_clause%', 1, '%dashboard_context-must_not_clause%', 2] },
      { arr: [ctxObj.bool.must, 1, ctxObj.bool.must_not, 2] },
      ctxObj
    )
  );
  it(
    `%autointerval% = true`,
    test({ interval: { '%autointerval%': true } }, { interval: `1h` }, ctxObj)
  );
  it(
    `%autointerval% = 10`,
    test({ interval: { '%autointerval%': 10 } }, { interval: `3h` }, ctxObj)
  );
  it(`%timefilter% = min`, test({ a: { '%timefilter%': 'min' } }, { a: rangeStart }));
  it(`%timefilter% = max`, test({ a: { '%timefilter%': 'max' } }, { a: rangeEnd }));
  it(
    `%timefilter% = true`,
    test(
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
  function test(req, ctx, expected) {
    return () => {
      create(rangeStart, rangeEnd, ctx).parseUrl({}, req);
      expect(req).to.eql(expected);
    };
  }

  it(
    `%context_query%=true`,
    test({ index: '_all', '%context_query%': true }, ctxArr, {
      index: '_all',
      body: { query: ctxArr },
    })
  );

  it(
    `%context%=true`,
    test({ index: '_all', '%context%': true }, ctxArr, { index: '_all', body: { query: ctxArr } })
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
        },
      },
    },
  };

  it(
    `%context_query%='abc'`,
    test({ index: '_all', '%context_query%': 'abc' }, ctxArr, expectedForCtxAndTimefield)
  );

  it(
    `%context%=true, %timefield%='abc'`,
    test(
      { index: '_all', '%context%': true, '%timefield%': 'abc' },
      ctxArr,
      expectedForCtxAndTimefield
    )
  );

  it(
    `%timefield%='abc'`,
    test({ index: '_all', '%timefield%': 'abc' }, ctxArr, {
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

  it(`no esRequest`, test({ index: '_all' }, ctxArr, { index: '_all', body: {} }));

  it(
    `esRequest`,
    test({ index: '_all', body: { query: 2 } }, ctxArr, {
      index: '_all',
      body: { query: 2 },
    })
  );
});
