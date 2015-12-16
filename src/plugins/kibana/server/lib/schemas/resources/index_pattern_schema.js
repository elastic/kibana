const Joi = require('joi');
const createApiDocumentSchema = require('../common/create_api_document_schema');
const createResourceObjectSchema = require('../common/create_resource_object_schema');
const relationshipObjectSchema = require('../common/relationship_object_schema');

const indexPatternResourceObject = createResourceObjectSchema(
  Joi.object({
    title: Joi.string().required(),
    time_field_name: Joi.string(),
    interval_name: Joi.string(),
    fields: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        count: Joi.number().integer(),
        scripted: Joi.boolean(),
        doc_values: Joi.boolean(),
        analyzed: Joi.boolean(),
        indexed: Joi.boolean(),
        type: Joi.string(),
        script: Joi.string(),
        lang: Joi.string()
      })
    ),
    field_format_map: Joi.object()
  }),
  Joi.object({
    template: relationshipObjectSchema
  })
);

module.exports = {
  post: createApiDocumentSchema(
    Joi.alternatives().try(
      indexPatternResourceObject,
      Joi.array().items(indexPatternResourceObject)
    ),
    Joi.array().items(
      createResourceObjectSchema(
        Joi.object({
          template: Joi.string().required(),
          order: Joi.number().integer(),
          mappings: Joi.object()
        }).unknown()
      )
    )
  ),

  // No attributes are required for an update
  // Templates can't be updated in an index_pattern PUT
  put: createApiDocumentSchema(
    createResourceObjectSchema(
      Joi.object({
        title: Joi.string(),
        time_field_name: Joi.string(),
        interval_name: Joi.string(),
        fields: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            count: Joi.number().integer(),
            scripted: Joi.boolean(),
            doc_values: Joi.boolean(),
            analyzed: Joi.boolean(),
            indexed: Joi.boolean(),
            type: Joi.string(),
            script: Joi.string(),
            lang: Joi.string()
          })
        ),
        field_format_map: Joi.object()
      }),
      Joi.object({
        template: relationshipObjectSchema
      })
    )
  )
};
