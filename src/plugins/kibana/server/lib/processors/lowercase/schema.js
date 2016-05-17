import Joi from 'joi';
import { base } from '../base/schema';

export const lowercase = base.keys({
  type_id: Joi.string().only('lowercase').required(),
  source_field: Joi.string().allow('')
});
