import sinon from 'sinon';
import { expect } from 'chai';
import { dashboardContextProvider } from '../dashboard_context';

describe('Dashboard Context', () => {

  describe('with query bar', () => {
    let Private;
    let getAppState;
    let getDashboardContext;
    beforeEach(() => {
      Private = sinon.stub().returns({
        getFilters() {
          return [];
        }
      });
    });

    it('should return an empty must and must not when there are no filters or queries', () => {
      getAppState = sinon.stub().returns({
        query: {
          language: 'lucene',
          query: null
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [],
          must_not: []
        }
      });
    });

    it('should add a valid query to must', () => {
      getAppState = sinon.stub().returns({
        query: {
          language: 'lucene',
          query: '*'
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [
            {
              query_string: {
                query: '*'
              }
            }
          ],
          must_not: []
        }
      });
    });

  });

  describe('with filter bar', () => {
    let Private;
    let getAppState;
    let getDashboardContext;
    beforeEach(() => {
      getAppState = sinon.stub().returns({ query: { language: 'something-else' } });
    });

    afterEach(() => {
      getAppState.reset();
    });

    it('should add a valid filter to must', () => {
      Private = sinon.stub().returns({
        getFilters() {
          return [
            { meta: { negate: false }, term: { foo: 'bar' } }
          ];
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [{ term: { foo: 'bar' } }],
          must_not: []
        }
      });
    });

    it('should add a valid filter to must_not', () => {
      Private = sinon.stub().returns({
        getFilters() {
          return [
            { meta: { negate: true }, term: { foo: 'bar' } }
          ];
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [],
          must_not: [{ term: { foo: 'bar' } }]
        }
      });
    });

    it('should not add a disabled filter', () => {
      Private = sinon.stub().returns({
        getFilters() {
          return [
            { meta: { negate: true, disabled: true }, term: { foo: 'bar' } }
          ];
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [],
          must_not: []
        }
      });
    });

  });

});


