import Joi from 'joi';
import { base } from '../base/schema';

export const rename = base.keys({
  type_id: Joi.string().only('rename').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow('')
});
