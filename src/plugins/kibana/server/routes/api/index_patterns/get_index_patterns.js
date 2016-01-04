const { convertToSnakeCase } = require('../../../lib/case_conversion');
const _ = require('lodash');
const createApiDocument = require('../../../lib/api_document_builders/create_api_document');
const createResourceObject = require('../../../lib/api_document_builders/create_resource_object');
const Promise = require('bluebird');

module.exports = function getIndexPatterns(boundCallWithRequest) {
  const params = {
    index: '.kibana',
    type: 'index-pattern',
    body: {
      query: {
        match_all: {}
      }
    }
  };

  return boundCallWithRequest('search', params)
  .then(function parseResults(results) {
    const hits = results.hits.hits;
    return _.map(hits, (patternHit) => {
      if (patternHit._source.fields) {
        patternHit._source.fields = JSON.parse(patternHit._source.fields);
      }
      if (patternHit._source.fieldFormatMap) {
        patternHit._source.fieldFormatMap = JSON.parse(patternHit._source.fieldFormatMap);
      }

      const snakeAttributes = convertToSnakeCase(patternHit._source);
      return createResourceObject('index_patterns', patternHit._id, snakeAttributes);
    });
  })
  .then((patterns) => {
    return createApiDocument(patterns);
  });
};
