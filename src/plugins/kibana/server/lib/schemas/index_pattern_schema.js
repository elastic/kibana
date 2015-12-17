var Joi = require('joi');

module.exports = {
  post: Joi.object({
    title: Joi.string().required(),
    time_field_name: Joi.string(),
    interval_name: Joi.string(),
    fields: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      count: Joi.number().integer(),
      scripted: Joi.boolean(),
      mapping: Joi.object({
        type: Joi.string().required()
      }).unknown()
    })),
    field_format_map: Joi.object()
  }),

  put: Joi.object({
    title: Joi.string(),
    time_field_name: Joi.string(),
    interval_name: Joi.string(),
    fields: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      count: Joi.number().integer(),
      scripted: Joi.boolean(),
      mapping: Joi.any().forbidden()
    })),
    field_format_map: Joi.object()
  })
};
