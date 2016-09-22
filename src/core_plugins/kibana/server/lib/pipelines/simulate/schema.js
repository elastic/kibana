import Joi from 'joi';
import pipelineSchema from '../pipeline/schema';

export default Joi.object({
  pipeline: pipelineSchema,
  input: Joi.object().required()
});
