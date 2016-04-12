import Joi from 'joi';

const base = Joi.object({
  processor_id: Joi.string().required()
});

export const append = base.keys({
  type_id: Joi.string().only('append').required(),
  target_field: Joi.string().allow(''),
  values: Joi.array().items(Joi.string().allow(''))
});

export const convert = base.keys({
  type_id: Joi.string().only('convert').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow(''),
  type: Joi.string()
});

export const date = base.keys({
  type_id: Joi.string().only('date').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow(''),
  formats: Joi.array().items(Joi.string().allow('')),
  timezone: Joi.string().allow(''),
  locale: Joi.string().allow(''),
  custom_format: Joi.string().allow('')
});

export const geoip = base.keys({
  type_id: Joi.string().only('geoip').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow('')
});

export const grok = base.keys({
  type_id: Joi.string().only('grok').required(),
  source_field: Joi.string().allow(''),
  pattern: Joi.string().allow('')
});

export const gsub = base.keys({
  type_id: Joi.string().only('gsub').required(),
  source_field: Joi.string().allow(''),
  pattern: Joi.string().allow(''),
  replacement: Joi.string().allow('')
});

export const join = base.keys({
  type_id: Joi.string().only('join').required(),
  source_field: Joi.string().allow(''),
  separator: Joi.string().allow('')
});

export const lowercase = base.keys({
  type_id: Joi.string().only('lowercase').required(),
  source_field: Joi.string().allow('')
});

export const remove = base.keys({
  type_id: Joi.string().only('remove').required(),
  source_field: Joi.string().allow('')
});

export const rename = base.keys({
  type_id: Joi.string().only('rename').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow('')
});

export const set = base.keys({
  type_id: Joi.string().only('set').required(),
  target_field: Joi.string().allow(''),
  value: Joi.string().allow('')
});

export const split = base.keys({
  type_id: Joi.string().only('split').required(),
  source_field: Joi.string().allow(''),
  separator: Joi.string().allow('')
});
