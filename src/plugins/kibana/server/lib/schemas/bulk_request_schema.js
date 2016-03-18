import Joi from 'joi';

export default Joi.object({
  csv: Joi.object().required(),
  pipeline: Joi.boolean(),
  delimiter: Joi.string()
});
