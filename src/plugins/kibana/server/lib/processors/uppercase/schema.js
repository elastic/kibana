import Joi from 'joi';
import { base } from '../base/schema';

export const uppercase = base.keys({
  type_id: Joi.string().only('uppercase').required(),
  source_field: Joi.string().allow('')
});
