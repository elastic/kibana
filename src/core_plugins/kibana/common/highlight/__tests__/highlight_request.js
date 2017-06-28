import expect from 'expect.js';
import { getHighlightRequest } from '../highlight_request';

describe('getHighlightRequest', () => {
  let configMock;
  const getConfig = (key) => configMock[key];
  const queryStringQuery = { query_string: { query: 'foo' } };
  const queryStringWithDefaultFieldQuery = { query_string: { query: 'foo', default_field: 'bar' } };
  const queryStringWithFieldQuery = { query_string: { query: 'foo', fields: ['bar'] } };
  const rangeQuery = { range: { '@timestamp': { gte: 0, lte: 0 } } };
  const boolQueryWithSingleCondition = {
    bool: {
      must: queryStringQuery,
    }
  };
  const boolQueryWithMultipleConditions = {
    bool: {
      must: [
        queryStringQuery,
        rangeQuery
      ]
    }
  };

  beforeEach(function () {
    configMock = {};
    configMock['doc_table:highlight'] = true;
    configMock['doc_table:highlight:all_fields'] = true;
  });

  it('should be a function', () => {
    expect(getHighlightRequest).to.be.a(Function);
  });

  it('should add the all_fields param with query_string query without modifying original query', () => {
    const request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.query_string).to.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should add the all_fields param with bool query with single condition without modifying original query', () => {
    const request = getHighlightRequest(boolQueryWithSingleCondition, getConfig);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.bool.must.query_string).to.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should add the all_fields param with bool query with multiple conditions without modifying original query', () => {
    const request = getHighlightRequest(boolQueryWithMultipleConditions, getConfig);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.bool.must).to.have.length(boolQueryWithMultipleConditions.bool.must.length);
    expect(request.fields['*'].highlight_query.bool.must[0].query_string).to.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should return undefined if highlighting is turned off', () => {
    configMock['doc_table:highlight'] = false;
    const request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.be(undefined);
  });

  it('should not add the highlight_query param if all_fields is turned off', () => {
    configMock['doc_table:highlight:all_fields'] = false;
    const request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request.fields['*']).to.not.have.property('highlight_query');
  });

  it('should enable/disable highlighting if config is changed', () => {
    let request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.not.be(undefined);

    configMock['doc_table:highlight'] = false;
    request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.be(undefined);
  });

  it('should not add the all_fields param with query_string query when default_field is specified', () => {
    const request = getHighlightRequest(queryStringWithDefaultFieldQuery, getConfig);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.query_string).to.have.property('default_field');
    expect(request.fields['*'].highlight_query.query_string).to.not.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should not add the all_fields param with query_string query when fields are specified', () => {
    const request = getHighlightRequest(queryStringWithFieldQuery, getConfig);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.query_string).to.have.property('fields');
    expect(request.fields['*'].highlight_query.query_string).to.not.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });
});
