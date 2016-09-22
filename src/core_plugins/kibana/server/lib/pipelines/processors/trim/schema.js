import Joi from 'joi';

export default function (server) {
  const baseSchema = server.plugins.kibana.pipelines.processors.baseSchema;

  return baseSchema.keys({
    type_id: Joi.string().only('trim').required(),
    source_field: Joi.string().allow(''),
    ignore_missing: Joi.bool().required()
  });
}
