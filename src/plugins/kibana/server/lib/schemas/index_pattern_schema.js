const Joi = require('joi');
const createApiDocumentSchema = require('./create_api_document_schema');
const createResourceObject = require('./create_resource_object');
const relationshipObjectSchema = require('./relationship_object_schema');


module.exports = {
  post: createApiDocumentSchema(
    createResourceObject(
      Joi.object({
        title: Joi.string().required(),
        time_field_name: Joi.string(),
        interval_name: Joi.string(),
        fields: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            count: Joi.number().integer(),
            scripted: Joi.boolean()
          })
        ),
        field_format_map: Joi.object()
      }),
      Joi.object({
        template: relationshipObjectSchema
      })
    ),
    Joi.array().items(
      createResourceObject(
        Joi.object({
          template: Joi.string().required(),
          order: Joi.number().integer(),
          mappings: Joi.object()
        })
      )
    )
  ),

  // No attributes are required for an update
  // Templates can't be updated in an index_pattern PUT
  put: createApiDocumentSchema(
    createResourceObject(
      Joi.object({
        title: Joi.string(),
        time_field_name: Joi.string(),
        interval_name: Joi.string(),
        fields: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            count: Joi.number().integer(),
            scripted: Joi.boolean()
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
