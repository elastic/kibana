import Joi from 'joi';
import { base } from '../base/schema';

export const split = base.keys({
  type_id: Joi.string().only('split').required(),
  source_field: Joi.string().allow(''),
  separator: Joi.string().allow('')
});
