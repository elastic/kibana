const { convertToSnakeCase } = require('../../../lib/case_conversion');
const _ = require('lodash');
const createApiDocument = require('../../../lib/api_document_builders/create_api_document');
const createRelationshipObject = require('../../../lib/api_document_builders/create_relationship_object');
const createResourceObject = require('../../../lib/api_document_builders/create_resource_object');
const Promise = require('bluebird');

module.exports = function getIndexPatterns(boundCallWithRequest, shouldIncludeTemplate) {
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

      let relationshipsObject;
      if (patternHit._source.templateId) {
        relationshipsObject = {
          template: createRelationshipObject('index_templates', patternHit._source.templateId)
        };
        delete patternHit._source.templateId;
      }
      const snakeAttributes = convertToSnakeCase(patternHit._source);
      return createResourceObject('index_patterns', patternHit._id, snakeAttributes, relationshipsObject);
    });
  })
  .then((patterns) => {
    if (!shouldIncludeTemplate) {
      return createApiDocument(patterns);
    }

    const templateIdSet = new Set();
    patterns.forEach(pattern => {
      const templateId = _.get(pattern, 'relationships.template.data.id');
      if (templateId) {
        templateIdSet.add(templateId);
      }
    });

    const commaDelimitedTemplateIds = Array.from(templateIdSet).join(',');

    return boundCallWithRequest('indices.getTemplate', {name: commaDelimitedTemplateIds})
    .then((templates) => {
      return _.map(templates, (template, templateId) => {
        return createResourceObject('index_templates', templateId, template);
      });
    })
    .then((templates) => {
      return createApiDocument(patterns, templates);
    });
  });
};
