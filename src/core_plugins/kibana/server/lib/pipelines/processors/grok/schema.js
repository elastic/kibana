import Joi from 'joi';

export default function (server) {
  const baseSchema = server.plugins.kibana.pipelines.processors.baseSchema;

  return baseSchema.keys({
    type_id: Joi.string().only('grok').required(),
    source_field: Joi.string().allow(''),
    pattern: Joi.array().items(Joi.string().allow('')),
    trace_match: Joi.boolean(),
    pattern_definitions: Joi.array().items(Joi.object()),
    ignore_missing: Joi.bool().required()
  });
}
