import Joi from 'joi';

export default function (server) {
  const baseSchema = server.plugins.kibana.pipelines.processors.baseSchema;

  return baseSchema.keys({
    type_id: Joi.string().only('dot_expander').required(),
    source_field: Joi.string().allow(''),
    path: Joi.string().allow('')
  });
}
