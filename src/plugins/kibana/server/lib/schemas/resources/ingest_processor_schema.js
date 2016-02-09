import Joi from 'joi';

export default Joi.object({
  processorId: Joi.string().required(),
  typeId: Joi.string().required()
}).unknown();
