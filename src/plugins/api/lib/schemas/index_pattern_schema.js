var Joi = require('joi');

module.exports = Joi.object({
  title: Joi.string().required(),
  timeFieldName: Joi.string(),
  intervalName: Joi.string(),
  fields: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    count: Joi.number().integer(),
    scripted: Joi.boolean(),
    mapping: Joi.object({
      type: Joi.string().required()
    }).unknown()
  })),
  fieldFormatMap: Joi.object()
});
