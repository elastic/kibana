const Joi = require('joi');
const indexPatternSchema = require('./index_pattern_schema');
const pipelineSchema = require('./pipeline_schema');

module.exports = Joi.object({
  index_pattern: indexPatternSchema.required(),
  pipeline: pipelineSchema.required()
});
