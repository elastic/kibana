import expect from 'expect.js';
import { getHighlightRequest } from '../highlight_request';

describe('getHighlightRequest', () => {
  let configMock;
  const getConfig = (key) => configMock[key];
  const queryStringQuery = { query_string: { query: 'foo' } };

  beforeEach(function () {
    configMock = {};
    configMock['doc_table:highlight'] = true;
  });

  it('should be a function', () => {
    expect(getHighlightRequest).to.be.a(Function);
  });

  it('should not modify the original query', () => {
    getHighlightRequest(queryStringQuery, getConfig);
    expect(queryStringQuery.query_string).to.not.have.property('highlight');
  });

  it('should return undefined if highlighting is turned off', () => {
    configMock['doc_table:highlight'] = false;
    const request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.be(undefined);
  });

  it('should enable/disable highlighting if config is changed', () => {
    let request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.not.be(undefined);

    configMock['doc_table:highlight'] = false;
    request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.be(undefined);
  });
});
