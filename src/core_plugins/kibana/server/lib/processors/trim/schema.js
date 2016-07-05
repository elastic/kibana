import Joi from 'joi';
import { base } from '../base/schema';

export const trim = base.keys({
  type_id: Joi.string().only('trim').required(),
  source_field: Joi.string().allow('')
});
