import Joi from 'joi';
import { base } from '../base/schema';

export const gsub = base.keys({
  type_id: Joi.string().only('gsub').required(),
  source_field: Joi.string().allow(''),
  pattern: Joi.string().allow(''),
  replacement: Joi.string().allow('')
});
