import Joi from 'joi';
import { base } from '../base/schema';

export const join = base.keys({
  type_id: Joi.string().only('join').required(),
  source_field: Joi.string().allow(''),
  separator: Joi.string().allow('')
});
