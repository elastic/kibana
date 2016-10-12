import Joi from 'joi';
import processorArraySchema from '../processor_array/schema';
import sampleArraySchema from '../sample_array/schema';

export default Joi.object({
  pipeline_id: Joi.string().allow(''),
  description: Joi.string().allow(''),
  failure_action: Joi.string().allow(''),
  failure_processors: processorArraySchema.optional(),
  processors: processorArraySchema,
  samples: sampleArraySchema,
  sample_index: Joi.number().integer()
});
