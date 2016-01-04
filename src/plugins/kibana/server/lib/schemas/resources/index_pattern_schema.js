const Joi = require('joi');
const createApiDocumentSchema = require('../common/create_api_document_schema');
const createResourceObjectSchema = require('../common/create_resource_object_schema');
const relationshipObjectSchema = require('../common/relationship_object_schema');

const indexPatternResourceObject = createResourceObjectSchema(
  Joi.object({
    title: Joi.string().required(),
    time_field_name: Joi.string(),
    interval_name: Joi.string(),
    not_expandable: Joi.boolean(),
    fields: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        count: Joi.number().integer(),
        scripted: Joi.boolean(),
        doc_values: Joi.boolean(),
        analyzed: Joi.boolean(),
        indexed: Joi.boolean(),
        script: Joi.string(),
        lang: Joi.string()
      })
    ).required(),
    field_format_map: Joi.object()
  })
);

module.exports = {
  post: createApiDocumentSchema(
    Joi.alternatives().try(
      indexPatternResourceObject,
      Joi.array().items(indexPatternResourceObject)
    ).required()
  )
};
