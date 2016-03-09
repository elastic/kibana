import Joi from 'joi';

const base = Joi.object({
  processor_id: Joi.string().required()
}).unknown();

export const set = base.keys({
  type_id: Joi.string().only('set').required(),
  target_field: Joi.string().required(),
  value: Joi.any().required()
});
