import Joi from 'joi';

const base = Joi.object({
  processor_id: Joi.string().required()
});

export const set = base.keys({
  type_id: Joi.string().only('set').required(),
  target_field: Joi.string().allow(''),
  value: Joi.string().allow('')
});
