import Joi from 'joi';
import { base } from '../base/schema';

export const append = base.keys({
  type_id: Joi.string().only('append').required(),
  target_field: Joi.string().allow(''),
  values: Joi.array().items(Joi.string().allow(''))
});
