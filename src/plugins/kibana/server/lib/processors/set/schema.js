import Joi from 'joi';
import { base } from '../base/schema';

export const set = base.keys({
  type_id: Joi.string().only('set').required(),
  target_field: Joi.string().allow(''),
  value: Joi.string().allow('')
});
