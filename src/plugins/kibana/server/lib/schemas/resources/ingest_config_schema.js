const Joi = require('joi');
const ingestPatternSchema = require('./index_pattern_schema');

module.exports = Joi.object({
  index_pattern: ingestPatternSchema.required()
});
