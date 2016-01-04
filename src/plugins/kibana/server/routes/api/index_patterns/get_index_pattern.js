const { convertToSnakeCase } = require('../../../lib/case_conversion');
const _ = require('lodash');
const createApiDocument = require('../../../lib/api_document_builders/create_api_document');
const createResourceObject = require('../../../lib/api_document_builders/create_resource_object');


module.exports = function getIndexPattern(patternId, boundCallWithRequest) {
  const params = {
    index: '.kibana',
    type: 'index-pattern',
    id: patternId
  };

  return boundCallWithRequest('get', params)
  .then((result) => {
    if (result._source.fields) {
      result._source.fields = JSON.parse(result._source.fields);
    }
    if (result._source.fieldFormatMap) {
      result._source.fieldFormatMap = JSON.parse(result._source.fieldFormatMap);
    }

    const snakeAttributes = convertToSnakeCase(result._source);
    return createApiDocument(createResourceObject('index_patterns', result._id, snakeAttributes));
  });
};
