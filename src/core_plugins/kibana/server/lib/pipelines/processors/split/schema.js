import Joi from 'joi';

export default function (server) {
  const baseSchema = server.plugins.kibana.pipelines.processors.baseSchema;

  return baseSchema.keys({
    type_id: Joi.string().only('split').required(),
    source_field: Joi.string().allow(''),
    separator: Joi.string().allow('')
  });
}
