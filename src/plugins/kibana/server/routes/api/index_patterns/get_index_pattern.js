const { convertToSnakeCase } = require('../../../lib/case_conversion');
const _ = require('lodash');
const createApiDocument = require('../../../lib/api_document_builders/create_api_document');
const createRelationshipObject = require('../../../lib/api_document_builders/create_relationship_object');
const createResourceObject = require('../../../lib/api_document_builders/create_resource_object');


module.exports = function getIndexPattern(patternId, boundCallWithRequest, shouldIncludeTemplate) {
  const params = {
    index: '.kibana',
    type: 'index-pattern',
    id: patternId
  };

  return boundCallWithRequest('get', params)
  .then((result) => {
    result._source.fields = JSON.parse(result._source.fields);

    let relationshipsObject;
    if (result._source.template_id) {
      relationshipsObject = {
        template: createRelationshipObject('index_templates', result._source.template_id)
      };
      delete result._source.template_id;
    }

    const snakeAttributes = convertToSnakeCase(result._source);
    return createResourceObject('index_patterns', result._id, snakeAttributes, relationshipsObject);
  })
  .then((patternResource) => {
    if (!shouldIncludeTemplate) {
      return createApiDocument(patternResource);
    }
    const templateId = _.get(patternResource, 'relationships.template.data.id');

    return boundCallWithRequest('indices.getTemplate', {name: templateId})
      .then((template) => {
        return createApiDocument(patternResource, [
          createResourceObject('index_templates', templateId, template[templateId])
        ]);
      });
  });
};
