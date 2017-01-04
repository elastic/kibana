import Joi from 'joi';

export default Joi.object({
  doc: Joi.object().required(),
  description: Joi.string().allow('')
});
