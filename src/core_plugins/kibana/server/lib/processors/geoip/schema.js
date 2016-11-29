import Joi from 'joi';
import { base } from '../base/schema';

export const geoip = base.keys({
  type_id: Joi.string().only('geoip').required(),
  source_field: Joi.string().allow(''),
  target_field: Joi.string().allow(''),
  database_file: Joi.string().allow(''),
  database_fields: Joi.array().items(Joi.string().allow('')),
});
