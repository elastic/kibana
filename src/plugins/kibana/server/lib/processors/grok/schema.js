import Joi from 'joi';
import { base } from '../base/schema';

export const grok = base.keys({
  type_id: Joi.string().only('grok').required(),
  source_field: Joi.string().allow(''),
  pattern: Joi.string().allow('')
});
