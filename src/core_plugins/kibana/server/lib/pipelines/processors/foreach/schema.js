import Joi from 'joi';
import processorArraySchema from '../../processor_array/schema';

export default function (server) {
  const baseSchema = server.plugins.kibana.pipelines.processors.baseSchema;

  return baseSchema.keys({
    type_id: Joi.string().only('foreach').required(),
    target_field: Joi.string().allow(''),
    processors: processorArraySchema
  });
}
