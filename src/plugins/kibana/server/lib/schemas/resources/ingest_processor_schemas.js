import Joi from 'joi';

const base = Joi.object({
  processor_id: Joi.string().required()
});

export const append = base.keys({
  type_id: Joi.string().only('append').required(),
  target_field: Joi.string().allow(''),
  values: Joi.array().items(Joi.string().allow(''))
});

export const gsub = base.keys({
  type_id: Joi.string().only('gsub').required(),
  source_field: Joi.string().allow(''),
  pattern: Joi.string().allow(''),
  replacement: Joi.string().allow('')
});

export const set = base.keys({
  type_id: Joi.string().only('set').required(),
  target_field: Joi.string().allow(''),
  value: Joi.string().allow('')
});
