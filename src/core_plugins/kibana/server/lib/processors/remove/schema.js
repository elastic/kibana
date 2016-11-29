import Joi from 'joi';
import { base } from '../base/schema';

export const remove = base.keys({
  type_id: Joi.string().only('remove').required(),
  source_field: Joi.string().allow('')
});
