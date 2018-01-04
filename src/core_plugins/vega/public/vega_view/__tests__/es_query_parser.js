import _ from 'lodash';
import expect from 'expect.js';
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
      getBounds: () => ({
        min: { valueOf: () => min },
        max: { valueOf: () => max }
      })
    },
    () => _.cloneDeep(dashboardCtx),
    () => (inst.$$$warnCount = (inst.$$$warnCount || 0) + 1)
  );
  return inst;
}

describe(`EsQueryParser time`, () => {

  it(`getTimeRange`, () => expect(create(1000, 2000)._getTimeRange()).to.eql({ min: 1000, max: 2000 }));
  it(`roundInterval(4s)`, () => expect(EsQueryParser._roundInterval(4 * second)).to.be(`1s`));
  it(`roundInterval(4hr)`, () => expect(EsQueryParser._roundInterval(4 * hour)).to.be(`3h`));
  it(`getTimeBound`, () => expect(create(1000, 2000)._getTimeBound({}, `min`)).to.be(1000));
  it(`getTimeBound(shift 2d)`, () => expect(create(5, 2000)._getTimeBound({ shift: 2 }, `min`)).to.be(5 + 2 * day));
  it(`getTimeBound(shift -2hr)`, () => expect(create(10 * day, 20 * day)
    ._getTimeBound({ shift: -2, unit: `h` }, `min`))
    .to.be(10 * day - 2 * hour));
  it(`createRangeFilter({})`, () => {
    const obj = {};
    expect(create(1000, 2000)._createRangeFilter(obj))
      .to.eql({ format: `epoch_millis`, gte: 1000, lte: 2000 }).and.to.be(obj);
  });
  it(`createRangeFilter(shift 1s)`, () => {
    const obj = { shift: 5, unit: 's' };
    expect(create(1000, 2000)._createRangeFilter(obj))
      .to.eql({ format: `epoch_millis`, gte: 6000, lte: 7000 }).and.to.be(obj);
  });

});

describe(`EsQueryParser.injectQueryContextVars`, () => {

  function test(obj, expected, usesTime, ctx) {
    return () => {
      const opts = { isQuery: true, usesTime: false };
      create(rangeStart, rangeEnd, ctx)._injectContextVars(obj, opts);
      expect(obj).to.eql(expected);
      expect(opts).to.eql({ isQuery: true, usesTime });
    };
  }

  it(`empty`, test({}, {}, false));
  it(`simple`, () => {
    const obj = { a: { c: 10 }, b: [{ d: 2 }, 4, 5], c: [], d: {} };
    return test(obj, _.cloneDeep(obj), false)();
  });
  it(`must clause empty`, test({ arr: ['%dashboard_context-must_clause%'] }, { arr: [] }, false, {}));
  it(`must clause arr`, test({ arr: ['%dashboard_context-must_clause%'] }, { arr: [...ctxArr.bool.must] }, false, ctxArr));
  it(`must clause obj`, test({ arr: ['%dashboard_context-must_clause%'] }, { arr: [ctxObj.bool.must] }, false, ctxObj));
  it(`mixed clause arr`, test(
    { arr: [1, '%dashboard_context-must_clause%', 2, '%dashboard_context-must_not_clause%'] },
    { arr: [1, ...ctxArr.bool.must, 2, ...ctxArr.bool.must_not] }, false, ctxArr));
  it(`mixed clause obj`, test(
    { arr: ['%dashboard_context-must_clause%', 1, '%dashboard_context-must_not_clause%', 2] },
    { arr: [ctxObj.bool.must, 1, ctxObj.bool.must_not, 2] }, false, ctxObj));
  it(`%autointerval% = true`, test({ interval: { '%autointerval%': true } }, { interval: `1h` }, true, ctxObj));
  it(`%autointerval% = 10`, test({ interval: { '%autointerval%': 10 } }, { interval: `3h` }, true, ctxObj));
  it(`%timefilter% = min`, test({ a: { '%timefilter%': 'min' } }, { a: rangeStart }, true));
  it(`%timefilter% = max`, test({ a: { '%timefilter%': 'max' } }, { a: rangeEnd }, true));
  it(`%timefilter% = true`, test(
    { a: { '%timefilter%': true } },
    { a: { format: `epoch_millis`, gte: rangeStart, lte: rangeEnd } }, true));
});

describe(`EsQueryParser.parseEsRequest`, () => {
  function test(req, ctx, expected) {
    return () => {
      const actual = create(rangeStart, rangeEnd, ctx).parseEsRequest(req);
      expect(actual).to.eql(expected);
    };
  }

  it(`%context_query%=true`, test(
    { index: '_all', '%context_query%': true }, ctxArr,
    { index: '_all', body: { query: ctxArr }, usesTime: false }));

  it(`context=true`, test(
    { index: '_all', context: true }, ctxArr,
    { index: '_all', body: { query: ctxArr }, usesTime: false }));

  const expectedForCtxAndTimefield = {
    index: '_all',
    body: {
      query: {
        bool: {
          must: [
            { match_all: { c: 3 } },
            { range: { abc: { format: 'epoch_millis', gte: rangeStart, lte: rangeEnd } } }
          ],
          must_not: [{ 'd': 4 }]
        }
      }
    },
    usesTime: true
  };

  it(`%context_query%='abc'`, test(
    { index: '_all', '%context_query%': 'abc' }, ctxArr, expectedForCtxAndTimefield));

  it(`context=true, timefield='abc'`, test(
    { index: '_all', context: true, timefield: 'abc' }, ctxArr, expectedForCtxAndTimefield));

  it(`timefield='abc'`, test({ index: '_all', timefield: 'abc' }, ctxArr,
    {
      index: '_all',
      body: { query: { range: { abc: { format: 'epoch_millis', gte: rangeStart, lte: rangeEnd } } } },
      usesTime: true
    }
  ));

  it(`no esRequest`, test({ index: '_all' }, ctxArr, { index: '_all', body: {}, usesTime: false }));

  it(`esRequest`, test({ index: '_all', body: { query: 2 } }, ctxArr, { index: '_all', body: { query: 2 }, usesTime: false }));
});
