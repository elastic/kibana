import expect from 'expect.js';
import chrome from 'ui/chrome';
import { decorateQuery } from '../_decorate_query';

const config = chrome.getUiSettingsClient();
describe('Query decorator', function () {

  it('should be a function', function () {
    expect(decorateQuery).to.be.a(Function);
  });

  it('should merge in the query string options', function () {
    config.set('query:queryString:options', { analyze_wildcard: true });
    const decoratedQuery = decorateQuery({ query_string: { query: '*' } });
    expect(decoratedQuery).to.eql({ query_string: { query: '*', analyze_wildcard: true } });
  });
});
