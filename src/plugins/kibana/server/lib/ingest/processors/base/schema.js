import Joi from 'joi';

export const base = Joi.object({
  processor_id: Joi.string().required()
});
