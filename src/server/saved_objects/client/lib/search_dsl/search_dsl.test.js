import sinon from 'sinon';
import { getSearchDsl } from './search_dsl';
import * as queryParamsNS from './query_params';
import * as sortParamsNS from './sorting_params';

describe('getSearchDsl', () => {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  describe('validation', () => {
    it('throws when sortField is passed without type', () => {
      expect(() => {
        getSearchDsl({}, {
          type: undefined,
          sortField: 'title'
        });
      }).toThrowError(/sort without .+ type/);
    });
    it('throws when sortOrder without sortField', () => {
      expect(() => {
        getSearchDsl({}, {
          type: 'foo',
          sortOrder: 'desc'
        });
      }).toThrowError(/sortOrder requires a sortField/);
    });
  });

  describe('passes control', () => {
    it('passes (mappings, type, search, searchFields) to getQueryParams', () => {
      const spy = sandbox.spy(queryParamsNS, 'getQueryParams');
      const mappings = { type: { properties: {} } };
      const opts = {
        type: 'foo',
        search: 'bar',
        searchFields: ['baz']
      };

      getSearchDsl(mappings, opts);
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(
        spy,
        mappings,
        opts.type,
        opts.search,
        opts.searchFields,
      );
    });

    it('passes (mappings, type, sortField, sortOrder) to getSortingParams', () => {
      const spy = sandbox.stub(sortParamsNS, 'getSortingParams').returns({});
      const mappings = { type: { properties: {} } };
      const opts = {
        type: 'foo',
        sortField: 'bar',
        sortOrder: 'baz'
      };

      getSearchDsl(mappings, opts);
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(
        spy,
        mappings,
        opts.type,
        opts.sortField,
        opts.sortOrder,
      );
    });

    it('returns combination of getQueryParams and getSortingParams', () => {
      sandbox.stub(queryParamsNS, 'getQueryParams').returns({ a: 'a' });
      sandbox.stub(sortParamsNS, 'getSortingParams').returns({ b: 'b' });
      expect(getSearchDsl({})).toEqual({ a: 'a', b: 'b' });
    });
  });
});
