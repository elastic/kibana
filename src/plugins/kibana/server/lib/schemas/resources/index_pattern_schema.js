import Joi from 'joi';

module.exports = Joi.object({
  id: Joi.string().required(),
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
  ).required().min(1),
  field_format_map: Joi.object()
});
