import Joi from 'joi';
import { base } from '../base/schema';

export const convert = base.keys({
  type_id: Joi.string().only('convert').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow(''),
  type: Joi.string()
});
