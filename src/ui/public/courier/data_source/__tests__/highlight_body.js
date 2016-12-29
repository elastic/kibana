import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import 'ui/highlight/highlight_tags';
import highlightBodyProvider from 'ui/courier/data_source/_highlight_body';

describe('Body highlighter', () => {
  const queryStringQuery = { query_string: { query: 'foo' } };
  const boolQuery = { bool: { must: [
    { query_string: { query: 'foo' } },
    { range: { '@timestamp': { gte: 0, lte: 0 } } }
  ] } };

  let config;
  let previousHighlightConfig;
  let previousAllFieldsConfig;
  let highlightTags;
  let highlightBody;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_config_, _highlightTags_) {
    config = _config_;
    previousHighlightConfig = config.get('doc_table:highlight');
    previousAllFieldsConfig = config.get('doc_table:highlight:all_fields');
    highlightTags = _highlightTags_;
  }));

  afterEach(() => {
    config.set('doc_table:highlight', previousHighlightConfig);
    config.set('doc_table:highlight:all_fields', previousAllFieldsConfig);
  });

  it('should be a function', () => {
    highlightBody = highlightBodyProvider(config, highlightTags);
    expect(highlightBody).to.be.a(Function);
  });

  it('should merge in the highlight params', () => {
    highlightBody = highlightBodyProvider(config, highlightTags);
    const body = { query: queryStringQuery };
    highlightBody(body);
    expect(body).to.have.property('highlight');
  });

  it('should add the all_fields param with query_string query without modifying original query', () => {
    highlightBody = highlightBodyProvider(config, highlightTags);
    const body = { query: queryStringQuery };
    highlightBody(body);
    expect(body).to.have.property('highlight');
    expect(body.highlight.fields['*']).to.have.property('highlight_query');
    expect(body.highlight.fields['*'].highlight_query.query_string).to.have.property('all_fields');
    expect(body.query.query_string).to.not.have.property('all_fields');
  });

  it('should add the all_fields param with bool query without modifying original query', () => {
    highlightBody = highlightBodyProvider(config, highlightTags);
    const body = { query: boolQuery };
    highlightBody(body);
    expect(body).to.have.property('highlight');
    expect(body.highlight.fields['*']).to.have.property('highlight_query');
    expect(body.highlight.fields['*'].highlight_query.bool.must).to.have.length(boolQuery.bool.must.length);
    expect(body.highlight.fields['*'].highlight_query.bool.must[0].query_string).to.have.property('all_fields');
    expect(body.query.bool.must[0].query_string).to.not.have.property('all_fields');
  });

  it('should do nothing if highlighting is turned off', () => {
    config.set('doc_table:highlight', false);
    highlightBody = highlightBodyProvider(config, highlightTags);
    const body = { query: queryStringQuery };
    highlightBody(body);
    expect(body).to.not.have.property('highlight');
  });

  it('should not add the highlight_query param if all_fields is turned off', () => {
    config.set('doc_table:highlight:all_fields', false);
    highlightBody = highlightBodyProvider(config, highlightTags);
    const body = { query: queryStringQuery };
    highlightBody(body);
    expect(body).to.have.property('highlight');
    expect(body.highlight.fields['*']).to.not.have.property('highlight_query');
  });
});
