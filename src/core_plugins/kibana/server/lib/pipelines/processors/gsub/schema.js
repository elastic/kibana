import Joi from 'joi';

export default function (server) {
  const baseSchema = server.plugins.kibana.pipelines.processors.baseSchema;

  return baseSchema.keys({
    type_id: Joi.string().only('gsub').required(),
    source_field: Joi.string().allow(''),
    pattern: Joi.string().allow(''),
    replacement: Joi.string().allow('')
  });
}
