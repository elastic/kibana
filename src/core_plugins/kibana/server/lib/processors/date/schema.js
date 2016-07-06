import Joi from 'joi';
import { base } from '../base/schema';

export const date = base.keys({
  type_id: Joi.string().only('date').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow(''),
  formats: Joi.array().items(Joi.string().allow('')),
  timezone: Joi.string().allow(''),
  locale: Joi.string().allow(''),
  custom_format: Joi.string().allow('')
});
